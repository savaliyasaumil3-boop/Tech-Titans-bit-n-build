"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Bell, Check, ChevronRight, CircleAlert, ClipboardList, Clock3, Home, History, LogOut, Map, Navigation, PackageCheck, RefreshCw, Route as RouteIcon, Search, Truck, Weight } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import type { DbBin, DbVehicle } from "@/lib/db-types";
import { DynamicMap } from "@/components/map/dynamic-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Stop = { id: string; route_plan_id: string; bin_id: string; sequence_order: number; status: string; planned_load_kg: number; access_instructions?: string | null; bin?: { id: string; location_name: string; latitude: number; longitude: number; capacity_kg: number; current_fill_kg: number; fill_percentage: number; waste_type: DbBin["waste_type"]; status: DbBin["status"]; predicted_full_hours: number; priority_score: number; last_updated: string; created_at: string } };
type RoutePlan = { id: string; vehicle_id: string; driver_id: string; status: string; stops_json: unknown; total_distance_km: number; estimated_time_minutes: number };
type Vehicle = DbVehicle;
type Facility = { id: string; name: string };
type Receipt = { id: string; facility_name: string; net_weight_kg: number; acceptance_status: string; unloaded_at: string };
type CollectionRecord = { id: string; collected_weight_kg: number; collection_outcome: string; route_plan_id: string | null };
type DriverIssue = { id: string; issue_type: string; notes: string; status: string; created_at: string };
type DriverAlert = { id: string; type: string; severity: string; message: string; is_read: boolean; created_at: string };
type DriverShift = { id: string; status: string; started_at: string | null; last_location_at: string | null; start_load_kg: number; vehicle_id: string };
type ChecklistItem = { id: string; route_stop_id: string; checklist_key: string; label: string; is_required: boolean; completed: boolean; completed_at: string | null };
type Screen = "home" | "assignment" | "route" | "pickup" | "issue" | "unload" | "summary" | "history";
type PrimaryScreen = "shift" | "route" | "unload" | "activity";
type ActivityTab = "alerts" | "reports" | "history";

const screens: { id: Screen; label: string }[] = [
  { id: "home", label: "Home" }, { id: "assignment", label: "Assignment" }, { id: "route", label: "Active route" },
  { id: "pickup", label: "Pickup" }, { id: "issue", label: "Report issue" }, { id: "unload", label: "Unloading" },
  { id: "summary", label: "Shift summary" }, { id: "history", label: "History" },
];

function stopTone(status: string) {
  if (status === "completed" || status === "picked_up") return "bg-green-100 text-green-800";
  if (status === "partial") return "bg-amber-100 text-amber-800";
  if (status === "blocked") return "bg-red-100 text-red-800";
  return "bg-muted text-muted-foreground";
}

function displayStopStatus(status: string) {
  if (status === "picked_up") return "picked up";
  if (status === "partial") return "partial";
  return status;
}

export default function DriverDashboardPage() {
  const router = useRouter();
  const { profile, loading: authLoading, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>("home");
  const [primaryScreen, setPrimaryScreen] = useState<PrimaryScreen>("shift");
  const [activityTab, setActivityTab] = useState<ActivityTab>("alerts");
  const [route, setRoute] = useState<RoutePlan | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [routeBins, setRouteBins] = useState<DbBin[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [busy, setBusy] = useState(false);
  const [syncState, setSyncState] = useState<"live" | "pending" | "error">("live");
  const [weight, setWeight] = useState("");
  const [residual, setResidual] = useState("0");
  const [facilityId, setFacilityId] = useState("");
  const [issueType, setIssueType] = useState("blocked_access");
  const [issueNote, setIssueNote] = useState("");
  const [pickupMode, setPickupMode] = useState<"measured" | "estimated">("measured");
  const [pickupOutcome, setPickupOutcome] = useState<"completed" | "partial">("completed");
  const [binConfirmation, setBinConfirmation] = useState("");
  const [pickupNote, setPickupNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [historyRoutes, setHistoryRoutes] = useState<RoutePlan[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [issues, setIssues] = useState<DriverIssue[]>([]);
  const [alerts, setAlerts] = useState<DriverAlert[]>([]);
  const [shift, setShift] = useState<DriverShift | null>(null);
  const [locationState, setLocationState] = useState<"unknown" | "fresh" | "stale" | "unavailable">("unknown");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [receiptReference, setReceiptReference] = useState("");
  const [unloadMode, setUnloadMode] = useState<"full" | "partial">("partial");
  const [unloadAcceptance, setUnloadAcceptance] = useState<"accepted" | "rejected">("accepted");
  const [unloadNote, setUnloadNote] = useState("");
  const previousRouteRef = useRef<string | null>(null);

  const refresh = async () => {
    if (!supabase || !profile?.driver_id) return;
    setSyncState("pending");
    const { data: routeData } = await supabase.from("route_plans").select("*").eq("driver_id", profile.driver_id).in("status", ["dispatched", "accepted", "active"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    setRoute(routeData as RoutePlan | null);
    if (routeData) {
      const { data: stopData } = await supabase.from("route_stops").select("*, bin:bins(*)").eq("route_plan_id", routeData.id).order("sequence_order");
      setStops((stopData ?? []) as Stop[]);
      setRouteBins(((stopData ?? []).map((item) => item.bin).filter(Boolean)) as DbBin[]);
      const routeStopIds = (stopData ?? []).map((item) => item.id);
      const { data: checklistData } = await supabase.from("stop_checklist_items").select("id, route_stop_id, checklist_key, label, is_required, completed, completed_at").eq("route_plan_id", routeData.id).order("created_at");
      let hydratedChecklist = (checklistData ?? []) as ChecklistItem[];
      if (!hydratedChecklist.length && routeStopIds.length && profile.driver_id) {
        const rows = (stopData ?? []).flatMap((item) => [["verify_bin", "Verify the bin ID and location"], ["inspect_waste", "Inspect waste type and access safety"], ["record_reading", "Record weight and residual fill"], ["secure_area", "Secure the area before leaving"]].map(([checklist_key, label]) => ({ id: `${routeData.id}-${item.id}-${checklist_key}`, route_plan_id: routeData.id, route_stop_id: item.id, driver_id: profile.driver_id, checklist_key, label, is_required: true, completed: false })));
        const { data: createdChecklist } = await supabase.from("stop_checklist_items").upsert(rows, { onConflict: "route_stop_id,checklist_key" }).select("id, route_stop_id, checklist_key, label, is_required, completed, completed_at");
        hydratedChecklist = (createdChecklist ?? []) as ChecklistItem[];
      }
      setChecklist(hydratedChecklist);
    } else { setStops([]); setRouteBins([]); setChecklist([]); }
    if (profile.vehicle_id) {
      const { data } = await supabase.from("vehicles").select("*").eq("id", profile.vehicle_id).single();
      setVehicle(data as Vehicle | null);
    }
    const { data: facilityData } = await supabase.from("facilities").select("id, name").eq("is_active", true).order("name");
    setFacilities((facilityData ?? []) as Facility[]);
    const { data: routeHistory } = await supabase.from("route_plans").select("*").eq("driver_id", profile.driver_id).order("created_at", { ascending: false }).limit(20);
    setHistoryRoutes((routeHistory ?? []) as RoutePlan[]);
    const { data: receiptHistory } = await supabase.from("facility_receipts").select("id, facility_name, net_weight_kg, acceptance_status, unloaded_at").eq("driver_id", profile.driver_id).order("unloaded_at", { ascending: false }).limit(20);
    setReceipts((receiptHistory ?? []) as Receipt[]);
    const { data: collectionHistory } = await supabase.from("collection_events").select("id, collected_weight_kg, collection_outcome, route_plan_id").eq("driver_id", profile.driver_id).order("collected_at", { ascending: false }).limit(100);
    setCollections((collectionHistory ?? []) as CollectionRecord[]);
    const { data: issueHistory } = await supabase.from("route_issues").select("id, issue_type, notes, status, created_at").eq("driver_id", profile.driver_id).order("created_at", { ascending: false }).limit(20);
    setIssues((issueHistory ?? []) as DriverIssue[]);
    const { data: alertHistory } = await supabase.from("alerts").select("id, type, severity, message, is_read, created_at").eq("vehicle_id", profile.vehicle_id).order("created_at", { ascending: false }).limit(20);
    setAlerts((alertHistory ?? []) as DriverAlert[]);
    const { data: shiftData } = await supabase.from("driver_shifts").select("id, status, started_at, last_location_at, start_load_kg, vehicle_id").eq("driver_id", profile.driver_id).in("status", ["on_duty", "paused"]).maybeSingle();
    setShift(shiftData as DriverShift | null);
    if (shiftData?.last_location_at) setLocationState(Date.now() - new Date(shiftData.last_location_at).getTime() <= 5 * 60 * 1000 ? "fresh" : "stale");
    if (previousRouteRef.current && previousRouteRef.current !== `${routeData?.id ?? "none"}:${routeData?.status ?? "none"}`) setNotice("Your assignment changed. Review My Route before continuing.");
    previousRouteRef.current = `${routeData?.id ?? "none"}:${routeData?.status ?? "none"}`;
    setSyncState("live");
  };

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "driver")) router.replace("/login");
    void refresh();
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!supabase || !profile?.driver_id) return;
    const channel = supabase.channel(`driver-${profile.driver_id}`).on("postgres_changes", { event: "*", schema: "public", table: "route_plans", filter: `driver_id=eq.${profile.driver_id}` }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "route_stops" }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `vehicle_id=eq.${profile.vehicle_id}` }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "collection_events", filter: `driver_id=eq.${profile.driver_id}` }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "facility_receipts", filter: `driver_id=eq.${profile.driver_id}` }, refresh).subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [profile?.driver_id]);

  useEffect(() => {
    if (!shift || shift.status !== "on_duty" || !navigator.geolocation || !supabase || !profile?.driver_id || !vehicle) {
      if (shift?.status === "on_duty") setLocationState("unavailable");
      return;
    }
    const client = supabase;
    if (!client) return;
    const watchId = navigator.geolocation.watchPosition(async (position) => {
      const recordedAt = new Date().toISOString();
      setLocationState("fresh");
      await client.from("vehicle_locations").insert({ vehicle_id: vehicle.id, driver_id: profile.driver_id, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy_m: position.coords.accuracy, recorded_at: recordedAt });
      await client.from("driver_shifts").update({ last_location_lat: position.coords.latitude, last_location_lng: position.coords.longitude, last_location_at: recordedAt }).eq("id", shift.id).eq("driver_id", profile.driver_id);
      await client.from("vehicles").update({ latitude: position.coords.latitude, longitude: position.coords.longitude, location_updated_at: recordedAt, last_updated: recordedAt }).eq("id", vehicle.id);
    }, () => setLocationState("unavailable"), { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [shift?.id, shift?.status, profile?.driver_id, vehicle?.id]);

  const nextStop = useMemo(() => stops.find((stop) => ["pending", "partial"].includes(stop.status)), [stops]);
  const activeRouteForMap = useMemo(() => {
    const pendingStops = stops.filter((stop) => !["completed", "picked_up", "resolved"].includes(stop.status)).sort((a, b) => a.sequence_order - b.sequence_order);
    if (!pendingStops.length) return null;
    return {
      vehicle_id: vehicle?.id ?? route?.vehicle_id ?? "driver-vehicle",
      vehicle_number: vehicle?.vehicle_number ?? "Vehicle",
      total_distance_km: route?.total_distance_km ?? 0,
      estimated_time_minutes: route?.estimated_time_minutes ?? 0,
      total_collection_kg: pendingStops.reduce((sum, stop) => sum + stop.planned_load_kg, 0),
      route: pendingStops.map((stop) => stop.bin_id),
      stops: pendingStops.map((stop) => ({
        id: stop.id,
        name: stop.bin?.location_name ?? stop.bin_id,
        latitude: stop.bin?.latitude ?? 0,
        longitude: stop.bin?.longitude ?? 0,
        required_collection_kg: stop.planned_load_kg,
        priority: stop.sequence_order,
        order: stop.sequence_order,
      })),
    } as const;
  }, [stops, route?.estimated_time_minutes, route?.total_distance_km, route?.vehicle_id, vehicle?.id, vehicle?.vehicle_number]);
  const nextChecklist = checklist.filter((item) => item.route_stop_id === nextStop?.id);
  const checklistReady = nextChecklist.filter((item) => item.is_required).every((item) => item.completed);
  const completed = stops.filter((stop) => ["completed", "picked_up", "resolved"].includes(stop.status)).length;
  const progress = stops.length ? Math.round((completed / stops.length) * 100) : 0;
  const remainingCapacity = vehicle ? Math.max(0, vehicle.capacity_kg - vehicle.current_load_kg) : 0;
  const filteredRoutes = historyRoutes.filter((item) => item.id.toLowerCase().includes(historyQuery.toLowerCase()) || item.status.toLowerCase().includes(historyQuery.toLowerCase()));
  const filteredReceipts = receipts.filter((item) => item.id.toLowerCase().includes(historyQuery.toLowerCase()) || item.facility_name.toLowerCase().includes(historyQuery.toLowerCase()));

  if (authLoading || !profile || profile.role !== "driver") return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Checking access...</div>;
  if (!supabase) return <div className="p-6 text-sm text-red-700">Supabase authentication and persistence must be configured before a driver can work.</div>;

  const updateRoute = async (status: string) => {
    const client = supabase;
    if (!client || !route) return;
    if ((status === "active" || status === "completed" || status === "completed_with_exceptions") && !shift) { setNotice("Start your shift before changing route status."); return; }
    setBusy(true); setSyncState("pending");
    const { error } = await client.from("route_plans").update({ status, updated_at: new Date().toISOString(), ...(status === "active" ? { started_at: new Date().toISOString(), actual_started_at: new Date().toISOString() } : {}), ...(status === "completed" || status === "completed_with_exceptions" ? { completed_at: new Date().toISOString(), handover_at: new Date().toISOString() } : {}) }).eq("id", route.id).eq("driver_id", profile.driver_id);
    if (error) { setSyncState("error"); setNotice(error.message); } else { setNotice(status === "accepted" ? "Assignment accepted." : "Route started."); await refresh(); }
    setBusy(false);
  };

  const startShift = async () => {
    const client = supabase;
    if (!client || !profile.driver_id || !vehicle || vehicle.status === "maintenance" || vehicle.status === "offline") { setNotice("An operational assigned vehicle is required to start a shift."); return; }
    setBusy(true); setSyncState("pending");
    const shiftId = `SHIFT-${profile.driver_id}-${new Date().toISOString().slice(0, 10)}`;
    const { data, error } = await client.from("driver_shifts").upsert({ id: shiftId, driver_id: profile.driver_id, user_id: profile.id, vehicle_id: vehicle.id, status: "on_duty", start_load_kg: vehicle.current_load_kg, started_at: new Date().toISOString() }, { onConflict: "id" }).select("id, status, started_at, last_location_at, start_load_kg, vehicle_id").single();
    if (!error) await client.from("vehicles").update({ duty_status: "on_duty", status: "available", last_updated: new Date().toISOString() }).eq("id", vehicle.id);
    if (error) { setSyncState("error"); setNotice(error.message); } else { setShift(data as DriverShift); setNotice("Shift started. Location permission is required for fresh assignment eligibility."); await refresh(); }
    setBusy(false);
  };

  const addMetric = async (patch: { collected_quantity_kg?: number; unloaded_quantity_kg?: number; rejected_quantity_kg?: number; completed_stops?: number; partial_stops?: number; blocked_stops?: number }) => {
    if (!supabase || !profile?.driver_id || !vehicle) return;
    const metricDate = new Date().toISOString().slice(0, 10);
    const { data: current } = await supabase.from("operational_metrics").select("*").eq("metric_date", metricDate).eq("vehicle_id", vehicle.id).eq("driver_id", profile.driver_id).maybeSingle();
    if (current) {
      const next = Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, Number(current[key] ?? 0) + Number(value ?? 0)]));
      await supabase.from("operational_metrics").update(next).eq("id", current.id);
    } else {
      await supabase.from("operational_metrics").insert({ metric_date: metricDate, vehicle_id: vehicle.id, driver_id: profile.driver_id, ...patch });
    }
  };

  const toggleChecklist = async (item: ChecklistItem) => {
    if (!supabase) return;
    const nextCompleted = !item.completed;
    const { error } = await supabase.from("stop_checklist_items").update({ completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null, completed_by: nextCompleted ? profile.id : null }).eq("id", item.id).eq("driver_id", profile.driver_id);
    if (!error) {
      setChecklist((items) => items.map((current) => current.id === item.id ? { ...current, completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null } : current));
      if (vehicle) await supabase.from("alerts").upsert({ id: `CHECKLIST-${item.id}`, vehicle_id: vehicle.id, type: "system", severity: "info", message: `${item.label}: ${nextCompleted ? "completed" : "reopened"} by ${profile.full_name ?? profile.driver_id}.`, is_read: false }, { onConflict: "id" });
    }
    else setNotice(error.message);
  };

  const submitPickup = async () => {
    const client = supabase;
    if (!client || !route || !nextStop || !vehicle || !weight) return;
    if (!checklistReady) { setNotice("Complete the required stop checklist before recording this pickup."); return; }

    const collectedWeight = Number(weight);
    const residualFill = Number(residual);
    const enteredBinId = (binConfirmation || nextStop.bin_id).trim();

    if (enteredBinId !== nextStop.bin_id || !Number.isFinite(collectedWeight) || collectedWeight <= 0 || collectedWeight > remainingCapacity || !Number.isFinite(residualFill) || residualFill < 0 || residualFill > 100) {
      if (binConfirmation.trim() && enteredBinId !== nextStop.bin_id) {
        setNotice("The entered bin ID does not match the current stop.");
        return;
      }
      if (!Number.isFinite(collectedWeight) || collectedWeight <= 0 || collectedWeight > remainingCapacity || !Number.isFinite(residualFill) || residualFill < 0 || residualFill > 100) {
        setNotice("Enter a valid weight within the truck's remaining capacity and a residual fill between 0% and 100%.");
        return;
      }
    }

    setBusy(true); setSyncState("pending");
    const pickupId = `P-${route.id.slice(-20)}-${nextStop.id.slice(-20)}-${pickupOutcome}`;
    const { data: existingPickup } = await client.from("collection_events").select("id").eq("id", pickupId).maybeSingle();
    if (existingPickup) { setNotice("This pickup is already saved."); setScreen("route"); setBusy(false); return; }
    const remainingWaste = Math.max(0, nextStop.planned_load_kg - collectedWeight);
    const { error } = await client.from("collection_events").insert({ id: pickupId, bin_id: nextStop.bin_id, vehicle_id: vehicle.id, driver_id: profile.driver_id, route_plan_id: route.id, stop_id: nextStop.id, collected_weight_kg: collectedWeight, residual_fill_percentage: residualFill, measurement_method: pickupMode, collection_outcome: pickupOutcome, remaining_waste_kg: remainingWaste, collection_notes: pickupNote.trim() || null, status: "completed", collected_at: new Date().toISOString() });
    if (!error) {
      const stopStatus = pickupOutcome === "partial" ? "partial" : "picked_up";
      const stopUpdate = await client.from("route_stops").update({ status: stopStatus, collection_event_id: pickupId, updated_at: new Date().toISOString() }).eq("id", nextStop.id).eq("route_plan_id", route.id).in("status", ["pending", "partial", "blocked"]);
      const vehicleUpdate = await client.from("vehicles").update({ current_load_kg: vehicle.current_load_kg + collectedWeight, status: "collecting", last_updated: new Date().toISOString() }).eq("id", vehicle.id);
      const binUpdate = await client.from("bins").update({ fill_percentage: residualFill, current_fill_kg: Math.round((residualFill / 100) * nextStop.bin!.capacity_kg * 10) / 10, last_updated: new Date().toISOString() }).eq("id", nextStop.bin_id);
      const { data: request } = await client.from("collection_requests").select("id").eq("assigned_route_id", route.id).eq("bin_id", nextStop.bin_id).maybeSingle();
      if (request) await client.from("collection_requests").update({ status: pickupOutcome === "partial" ? "partially_completed" : "resolved", resolved_at: pickupOutcome === "partial" ? null : new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", request.id);
      if (stopUpdate.error || vehicleUpdate.error || binUpdate.error) setNotice("Pickup was recorded, but a live state update needs supervisor review.");
      await addMetric({ collected_quantity_kg: collectedWeight, ...(pickupOutcome === "partial" ? { partial_stops: 1 } : { completed_stops: 1 }) });
    }
    if (error) { setSyncState("error"); setNotice(error.message); } else { setNotice(pickupOutcome === "partial" ? "Partial pickup saved and synced." : "Pickup saved and synced."); setWeight(""); setResidual("0"); setBinConfirmation(""); setPickupNote(""); await refresh(); setScreen("route"); }
    setBusy(false);
  };

  const submitIssue = async () => {
    const client = supabase;
    if (!client || !vehicle || !route || !nextStop || !issueNote.trim()) return;
    setBusy(true); setSyncState("pending");
    const issueId = `ISSUE-${route.id}-${nextStop.id}-${issueType}`;
    const { data: existingIssue } = await client.from("route_issues").select("id").eq("id", issueId).maybeSingle();
    if (existingIssue) { setNotice("This issue is already open for the selected stop."); setBusy(false); return; }
    const { error } = await client.from("route_issues").insert({ id: issueId, route_plan_id: route.id, stop_id: nextStop.id, vehicle_id: vehicle.id, driver_id: profile.driver_id, issue_type: issueType, notes: issueNote.trim(), status: "open" });
    if (!error) {
      await client.from("alerts").insert({ id: issueId, vehicle_id: vehicle.id, type: issueType, severity: "warning", message: `${nextStop.bin?.location_name ?? nextStop.bin_id}: ${issueNote.trim()}`, is_read: false });
      await client.from("route_stops").update({ status: "blocked", updated_at: new Date().toISOString() }).eq("id", nextStop.id).eq("status", "pending");
      await client.from("collection_requests").update({ status: "unassigned", assigned_vehicle_id: null, assigned_route_id: null, reservation_kg: 0, unassigned_reason: issueNote.trim(), updated_at: new Date().toISOString() }).eq("assigned_route_id", route.id).eq("bin_id", nextStop.bin_id);
      await addMetric({ blocked_stops: 1 });
    }
    if (error) { setSyncState("error"); setNotice(error.message); } else { setNotice("Issue reported and stop handed back to the supervisor."); setIssueNote(""); await refresh(); setScreen("route"); }
    setBusy(false);
  };

  const submitUnload = async () => {
    const client = supabase;
    if (!client || !vehicle || !facilityId || !weight) return;
    const unloadedWeight = Number(weight);
    if (!Number.isFinite(unloadedWeight) || unloadedWeight <= 0 || unloadedWeight > vehicle.current_load_kg) { setNotice("Enter an unload quantity no greater than the current truck load."); return; }
    setBusy(true); setSyncState("pending");
    const facility = facilities.find((item) => item.id === facilityId);
    const receiptId = `RECEIPT-${vehicle.id}-${Date.now()}`;
    const { error } = await client.from("facility_receipts").insert({ id: receiptId, facility_id: facilityId, vehicle_id: vehicle.id, driver_id: profile.driver_id, facility_name: facility?.name ?? "Selected facility", gross_weight_kg: unloadedWeight, net_weight_kg: unloadedWeight, accepted_waste_type: "Mixed recyclable", acceptance_status: unloadAcceptance, receipt_reference: receiptReference.trim() || null, material_breakdown: unloadNote.trim() ? { note: unloadNote.trim() } : {}, status: unloadAcceptance === "accepted" ? "processed" : "rejected" });
    if (!error && unloadAcceptance === "accepted") await client.from("vehicles").update({ current_load_kg: Math.max(0, vehicle.current_load_kg - unloadedWeight), status: route && stops.some((stop) => ["pending", "partial"].includes(stop.status)) ? "collecting" : "returning", last_updated: new Date().toISOString() }).eq("id", vehicle.id);
    if (!error && unloadAcceptance === "rejected") await client.from("alerts").insert({ id: `UNLOAD-REJECTED-${receiptId}`, vehicle_id: vehicle.id, type: "vehicle", severity: "warning", message: `Facility rejected ${unloadedWeight}kg from receipt ${receiptId}. Load remains on vehicle.`, is_read: false });
    if (!error) await addMetric(unloadAcceptance === "accepted" ? { unloaded_quantity_kg: unloadedWeight } : { rejected_quantity_kg: unloadedWeight });
    if (error) { setSyncState("error"); setNotice(error.message); } else { setNotice(unloadAcceptance === "accepted" ? "Unload receipt saved and load updated." : "Rejected receipt saved; load remains on vehicle and supervisor notified."); setWeight(""); setReceiptReference(""); setUnloadNote(""); await refresh(); setScreen(route && stops.some((stop) => ["pending", "partial"].includes(stop.status)) ? "route" : "summary"); }
    setBusy(false);
  };

  const finishRoute = async () => {
    if (!route) return;
    const unresolved = stops.some((stop) => ["pending", "partial", "blocked"].includes(stop.status));
    await updateRoute(unresolved ? "completed_with_exceptions" : "completed");
    setScreen("summary");
  };

  const nav = (next: Screen) => {
    setNotice(null);
    setScreen(next);
    if (["home", "summary"].includes(next)) setPrimaryScreen("shift");
    if (["assignment", "route", "pickup", "issue"].includes(next)) setPrimaryScreen("route");
    if (next === "unload") setPrimaryScreen("unload");
    if (next === "history") setPrimaryScreen("activity");
  };

  const openPrimary = (next: PrimaryScreen) => {
    setNotice(null);
    setPrimaryScreen(next);
    if (next === "shift") setScreen("home");
    if (next === "route") setScreen("route");
    if (next === "unload") setScreen("unload");
    if (next === "activity") { setScreen("history"); setActivityTab("alerts"); }
  };

  return <main className="min-h-screen bg-background pb-24 md:pl-64 md:pb-0">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-muted text-brand"><Truck className="h-5 w-5" /></div><div><p className="font-semibold tracking-tight">SwachhSetu</p><p className="text-xs text-muted-foreground">Driver workspace</p></div></div>
      <nav className="flex-1 space-y-1 p-4">{([['shift', 'My Shift', Home], ['route', 'My Route', RouteIcon], ['unload', 'Unloading & Finish', PackageCheck], ['activity', 'Activity', History]] as const).map(([id, label, Icon]) => <button key={id} onClick={() => openPrimary(id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${primaryScreen === id ? "bg-brand-muted text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
      <div className="border-t border-border p-4"><div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><span className={`h-2 w-2 rounded-full ${syncState === "live" ? "bg-green-500" : syncState === "pending" ? "bg-amber-500" : "bg-red-500"}`} />{syncState === "live" ? "Connected" : syncState === "pending" ? "Pending sync" : "Sync error"}</div><Button variant="outline" className="w-full justify-start" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Log out</Button></div>
    </aside>
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 md:px-8"><div className="mx-auto flex max-w-[1600px] items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-brand">{primaryScreen === "shift" ? "My Shift" : primaryScreen === "route" ? "My Route" : primaryScreen === "unload" ? "Unloading & Finish" : "Activity"}</p><h1 className="text-xl font-semibold">{profile.full_name ?? "Driver"}</h1></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><span className={`h-2 w-2 rounded-full ${syncState === "live" ? "bg-green-500" : syncState === "pending" ? "bg-amber-500" : "bg-red-500"}`} />{syncState === "live" ? "Connected" : syncState === "pending" ? "Pending sync" : "Sync error"}</div><Button size="icon" variant="ghost" onClick={() => openPrimary("activity")} aria-label="Notifications"><Bell className="h-4 w-4" />{alerts.some((alert) => !alert.is_read) && <span className="absolute ml-5 mt-[-18px] h-2 w-2 rounded-full bg-red-500" />}</Button><div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted text-sm font-semibold text-brand">{(profile.full_name ?? "D").slice(0, 1)}</div><span className="text-sm font-medium">{profile.full_name ?? "Driver"}</span></div><Button size="icon" variant="ghost" onClick={() => void signOut()} aria-label="Log out"><LogOut className="h-4 w-4" /></Button></div></div></header>
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6 md:hidden">
      {notice && <div role="status" className="rounded-lg border border-brand/30 bg-brand-muted px-4 py-3 text-sm text-green-800">{notice}</div>}
      {primaryScreen === "shift" && alerts.some((alert) => !alert.is_read) && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"><p className="text-sm font-semibold text-amber-900">Urgent updates</p><p className="mt-1 text-sm text-amber-800">{alerts.find((alert) => !alert.is_read)?.message}</p><Button size="sm" variant="outline" className="mt-3" onClick={() => openPrimary("activity")}>Review alerts</Button></div>}
      {screen === "home" && <><Card><CardContent className="space-y-5 p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">Assigned vehicle</p><p className="mt-1 text-2xl font-semibold">{vehicle?.vehicle_number ?? "Awaiting assignment"}</p><p className="mt-1 text-xs text-muted-foreground">Last location update: {vehicle?.last_updated ? new Date(vehicle.last_updated).toLocaleString() : "Unavailable"}</p></div><Truck className="h-7 w-7 text-brand" /></div><div><div className="mb-2 flex justify-between text-sm"><span>Shift progress</span><span className="font-medium">{progress}%</span></div><Progress value={progress} /></div><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg bg-muted p-3"><p className="text-muted-foreground">Capacity</p><p className="mt-1 font-semibold">{vehicle ? `${vehicle.current_load_kg} / ${vehicle.capacity_kg} kg` : "-"}</p></div><div className="rounded-lg bg-muted p-3"><p className="text-muted-foreground">Stops</p><p className="mt-1 font-semibold">{completed} / {stops.length}</p></div></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Current assignment</CardTitle></CardHeader><CardContent>{route ? <div className="flex items-center justify-between"><div><p className="font-medium">Route {route.id}</p><p className="text-sm text-muted-foreground">{nextStop?.bin?.location_name ?? "All stops complete"}</p></div><Badge variant="outline">{route.status}</Badge></div> : <p className="text-sm text-muted-foreground">Waiting for supervisor assignment.</p>}</CardContent></Card><div className="grid grid-cols-2 gap-3"><Button className="h-14" onClick={() => nav("assignment")} disabled={!route}>View assignment <ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" className="h-14" onClick={() => nav("issue")} disabled={!route || !nextStop}><CircleAlert className="mr-2 h-4 w-4" />Report issue</Button></div></>}
      {screen === "assignment" && <Card><CardHeader><CardTitle>Assignment details</CardTitle></CardHeader><CardContent className="space-y-4">{stops.map((stop) => <div key={stop.id} className="flex gap-3 rounded-lg border p-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-muted text-sm font-semibold text-brand">{stop.sequence_order}</div><div className="min-w-0 flex-1"><p className="font-medium">{stop.bin?.location_name ?? stop.bin_id}</p><p className="text-sm text-muted-foreground">{stop.bin?.waste_type ?? "Waste"} · {stop.planned_load_kg} kg planned</p></div><Badge variant="outline">{displayStopStatus(stop.status)}</Badge></div>)}<div className="flex gap-3">{route?.status === "dispatched" && <Button className="h-12 flex-1" onClick={() => void updateRoute("accepted")} disabled={busy}><Check className="mr-2 h-4 w-4" />Accept</Button>}{route?.status === "accepted" && <Button className="h-12 flex-1" onClick={() => void updateRoute("active")} disabled={busy}><Navigation className="mr-2 h-4 w-4" />Start route</Button>}<Button variant="outline" className="h-12" onClick={() => nav("route")}><ChevronRight className="h-4 w-4" /></Button></div></CardContent></Card>}
      {screen === "route" && <><Card><CardHeader><CardTitle className="flex items-center gap-2"><Map className="h-5 w-5 text-brand" />Active route</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex h-44 items-center justify-center rounded-xl bg-green-50 text-sm text-green-800"><Navigation className="mr-2 h-5 w-5" />Navigation ready for {nextStop?.bin?.location_name ?? "completed route"}</div><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Next stop</p><p className="font-semibold">{nextStop?.bin?.location_name ?? "No pending stops"}</p></div><Badge>{completed}/{stops.length} collected</Badge></div><div className="grid grid-cols-2 gap-2"><Button className="h-12" onClick={() => nav("pickup")} disabled={!nextStop}>View pickup <Weight className="ml-2 h-4 w-4" /></Button><Button variant="outline" className="h-12" onClick={() => void finishRoute()} disabled={busy || Boolean(nextStop)}>Finish route</Button></div></CardContent></Card></>}
      {screen === "pickup" && <Card><CardHeader><CardTitle>Verify pickup</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-lg bg-muted p-4"><p className="font-medium">{nextStop?.bin?.location_name}</p><p className="text-sm text-muted-foreground">Bin {nextStop?.bin_id} · {nextStop?.bin?.waste_type} · latest fill {nextStop?.bin?.fill_percentage}%</p><p className="mt-1 text-xs text-muted-foreground">Reading: {nextStop?.bin?.last_updated ? new Date(nextStop.bin.last_updated).toLocaleString() : "Unavailable"}</p></div><label className="block space-y-2 text-sm font-medium">Confirm bin ID<Input value={binConfirmation} onChange={(e) => setBinConfirmation(e.target.value)} placeholder={nextStop?.bin_id} /></label><div className="grid grid-cols-2 gap-2"><Button type="button" variant={pickupMode === "measured" ? "default" : "outline"} onClick={() => setPickupMode("measured")}>Measured</Button><Button type="button" variant={pickupMode === "estimated" ? "default" : "outline"} onClick={() => setPickupMode("estimated")}>Estimated</Button></div><label className="block space-y-2 text-sm font-medium">Collected weight (kg)<Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={`Up to ${remainingCapacity} kg`} /></label><label className="block space-y-2 text-sm font-medium">Residual fill (%)<Input inputMode="decimal" value={residual} onChange={(e) => setResidual(e.target.value)} /></label><div className="grid grid-cols-2 gap-2"><Button type="button" variant={pickupOutcome === "completed" ? "default" : "outline"} onClick={() => setPickupOutcome("completed")}>Complete stop</Button><Button type="button" variant={pickupOutcome === "partial" ? "default" : "outline"} onClick={() => setPickupOutcome("partial")}>Partial pickup</Button></div><Input value={pickupNote} onChange={(e) => setPickupNote(e.target.value)} placeholder="Optional note" /><Button className="h-12 w-full" onClick={() => void submitPickup()} disabled={busy || !nextStop || !weight || binConfirmation.trim() !== nextStop?.bin_id}>{busy ? "Saving..." : "Record pickup"}</Button></CardContent></Card>}
      {screen === "issue" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" />Report issue</CardTitle></CardHeader><CardContent className="space-y-4"><Select value={issueType} onValueChange={(value) => value && setIssueType(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="blocked_access">Blocked access</SelectItem><SelectItem value="missing_bin">Missing bin</SelectItem><SelectItem value="unsafe_waste">Unsafe waste</SelectItem><SelectItem value="breakdown">Vehicle breakdown</SelectItem></SelectContent></Select><Input value={issueNote} onChange={(e) => setIssueNote(e.target.value)} placeholder="Describe what happened" /><Button className="h-12 w-full" onClick={() => void submitIssue()} disabled={busy || !issueNote.trim()}>Send report</Button></CardContent></Card>}
      {screen === "unload" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-brand" />Unload vehicle</CardTitle><p className="text-sm text-muted-foreground">Current load: {vehicle?.current_load_kg ?? 0} kg</p></CardHeader><CardContent className="space-y-4"><Select value={facilityId} onValueChange={(value) => value && setFacilityId(value)}><SelectTrigger><SelectValue placeholder="Select approved facility" /></SelectTrigger><SelectContent>{facilities.map((facility) => <SelectItem key={facility.id} value={facility.id}>{facility.name}</SelectItem>)}</SelectContent></Select><div className="grid grid-cols-2 gap-2"><Button type="button" variant={unloadMode === "full" ? "default" : "outline"} onClick={() => { setUnloadMode("full"); setWeight(String(vehicle?.current_load_kg ?? 0)); }}>Full load</Button><Button type="button" variant={unloadMode === "partial" ? "default" : "outline"} onClick={() => setUnloadMode("partial")}>Partial</Button></div><Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Actual quantity unloaded (kg)" /><Input value={receiptReference} onChange={(e) => setReceiptReference(e.target.value)} placeholder="Receipt/reference (optional)" /><Button className="h-12 w-full" onClick={() => void submitUnload()} disabled={busy || !facilityId || !weight}>Save receipt</Button></CardContent></Card>}
      {screen === "summary" && <Card><CardHeader><CardTitle>Shift summary</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-3 text-center"><div className="rounded-lg bg-green-50 p-3"><p className="text-2xl font-semibold text-green-700">{completed}</p><p className="text-xs text-muted-foreground">Completed</p></div><div className="rounded-lg bg-amber-50 p-3"><p className="text-2xl font-semibold text-amber-700">{stops.filter((stop) => stop.status === "skipped").length}</p><p className="text-xs text-muted-foreground">Skipped</p></div><div className="rounded-lg bg-muted p-3"><p className="text-2xl font-semibold">{stops.filter((stop) => stop.status === "pending").length}</p><p className="text-xs text-muted-foreground">Pending</p></div></CardContent></Card>}
      {screen === "history" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-brand" />Activity</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-3 gap-2"><Button size="sm" variant={activityTab === "alerts" ? "default" : "outline"} onClick={() => setActivityTab("alerts")}>Alerts</Button><Button size="sm" variant={activityTab === "reports" ? "default" : "outline"} onClick={() => setActivityTab("reports")}>My Reports</Button><Button size="sm" variant={activityTab === "history" ? "default" : "outline"} onClick={() => setActivityTab("history")}>History</Button></div>{activityTab === "alerts" && <div className="space-y-2">{alerts.slice(0, 5).map((alert) => <div key={alert.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{alert.type.replaceAll("_", " ")}</p><Badge variant="outline">{alert.severity}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{alert.message}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</p></div>)}{!alerts.length && <p className="text-sm text-muted-foreground">No notifications yet.</p>}</div>}{activityTab === "reports" && <div className="space-y-2">{issues.map((issue) => <div key={issue.id} className="rounded-lg border p-3"><div className="flex items-center justify-between"><p className="text-sm font-medium">{issue.issue_type.replaceAll("_", " ")}</p><Badge variant="outline">{issue.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{issue.notes}</p></div>)}{!issues.length && <p className="text-sm text-muted-foreground">No reports submitted.</p>}</div>}{activityTab === "history" && <div className="space-y-2 text-sm text-muted-foreground"><p>{historyRoutes.length} route records</p><p>{receipts.length} unloading receipts</p><p>Pickup history is preserved in the collection records for each route.</p></div>}<Button variant="outline" className="mt-2" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh activity</Button></CardContent></Card>}
    </div>
    {screen === "route" && nextStop && <div className="mx-auto max-w-2xl space-y-3 px-4 pb-4 md:hidden"><Card><CardHeader><CardTitle>Stop checklist</CardTitle><p className="text-sm text-muted-foreground">Complete required checks before pickup.</p></CardHeader><CardContent className="space-y-2">{nextChecklist.map((item) => <label key={item.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={item.completed} onChange={() => void toggleChecklist(item)} />{item.label}</label>)}<p className={`text-xs ${checklistReady ? "text-green-700" : "text-amber-700"}`}>{checklistReady ? "Checklist complete" : "Required checks remaining"}</p></CardContent></Card></div>}
    <div className="mx-auto hidden max-w-[1600px] space-y-6 p-6 md:block xl:p-8">
      {notice && <div role="status" className="rounded-lg border border-brand/30 bg-brand-muted px-4 py-3 text-sm text-green-800">{notice}</div>}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Assigned vehicle</p><p className="mt-2 text-2xl font-semibold">{vehicle?.vehicle_number ?? "Awaiting assignment"}</p><p className="mt-1 text-xs text-muted-foreground">{vehicle?.status ?? "No vehicle linked"}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Remaining capacity</p><p className="mt-2 text-2xl font-semibold">{remainingCapacity} kg</p><Progress className="mt-3" value={vehicle ? Math.round((vehicle.current_load_kg / vehicle.capacity_kg) * 100) : 0} /></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Completed stops</p><p className="mt-2 text-2xl font-semibold text-green-700">{completed}</p><p className="mt-1 text-xs text-muted-foreground">{progress}% of current route</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pending stops</p><p className="mt-2 text-2xl font-semibold">{stops.filter((stop) => stop.status === "pending").length}</p><p className="mt-1 text-xs text-muted-foreground">{route?.status ?? "No active assignment"}</p></CardContent></Card>
      </section>
      {screen === "home" && <section className="grid grid-cols-12 gap-6">
        <Card className="col-span-12"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div><p className="text-sm font-semibold">Shift status</p><p className="text-sm text-muted-foreground">{shift?.status === "on_duty" ? "On duty" : "Off duty"} · location {locationState === "fresh" ? "fresh" : locationState === "stale" ? "stale" : locationState === "unavailable" ? "unavailable" : "not started"}</p></div>{!shift && <Button onClick={() => void startShift()} disabled={busy}>Start shift</Button>}{shift && <Badge variant="outline">Started {shift.started_at ? new Date(shift.started_at).toLocaleTimeString() : ""}</Badge>}</CardContent></Card>
        <Card className="col-span-7"><CardHeader><CardTitle>Today&apos;s assignment</CardTitle><p className="text-sm text-muted-foreground">Your next action for this shift.</p></CardHeader><CardContent className="space-y-5"><div className="rounded-xl bg-muted p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Shift status</p><p className="mt-1 text-xl font-semibold">{route?.status === "active" ? "Route in progress" : route?.status === "accepted" ? "Ready to start" : route?.status === "dispatched" ? "Assignment waiting for acceptance" : "Waiting for supervisor assignment"}</p></div><Badge variant="outline">{route?.status ?? "unassigned"}</Badge></div><p className="mt-3 text-sm text-muted-foreground">{nextStop ? `Next stop: ${nextStop.bin?.location_name ?? nextStop.bin_id}` : "No pending stop assigned yet."}</p></div><div className="flex flex-wrap gap-3">{route?.status === "dispatched" && <Button className="h-11" onClick={() => void updateRoute("accepted")} disabled={busy}>Accept assignment</Button>}{route?.status === "accepted" && <Button className="h-11" onClick={() => void updateRoute("active")} disabled={busy}>Start route</Button>}{route?.status === "active" && <Button className="h-11" onClick={() => openPrimary("route")}>Resume route <ArrowRight className="ml-2 h-4 w-4" /></Button>}<Button variant="outline" className="h-11" onClick={() => nav("issue")} disabled={!route || !nextStop}><AlertTriangle className="mr-2 h-4 w-4" />Report breakdown</Button></div></CardContent></Card>
        <Card className="col-span-5"><CardHeader><CardTitle>Shift alerts</CardTitle><p className="text-sm text-muted-foreground">Supervisor updates and urgent operational notices.</p></CardHeader><CardContent className="space-y-3">{alerts.slice(0, 4).map((alert) => <div key={alert.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{alert.type.replaceAll("_", " ")}</p><Badge variant="outline">{alert.severity}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{alert.message}</p></div>)}{!alerts.length && <p className="text-sm text-muted-foreground">No urgent alerts.</p>}<Button variant="outline" className="w-full" onClick={() => openPrimary("activity")}>Open Activity</Button></CardContent></Card>
      </section>}
      {screen === "route" && <Card className="overflow-hidden"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Map className="h-5 w-5 text-brand" />Live route map</CardTitle><p className="mt-1 text-sm text-muted-foreground">Assigned stops and vehicle position</p></div><Badge variant="outline">{syncState === "live" ? "Live" : "Pending sync"}</Badge></CardHeader><CardContent className="p-0"><DynamicMap dbBins={routeBins} vehicles={vehicle ? [vehicle] : []} activeRoute={activeRouteForMap ?? null} focusedBinId={nextStop?.bin_id} height={380} /></CardContent></Card>}
      {screen === "route" && <section className="driver-route-panels grid min-h-[560px] grid-cols-12 gap-6">
        <Card className="col-span-7 flex min-h-[560px] flex-col"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Map className="h-5 w-5 text-brand" />Live route map</CardTitle><p className="mt-1 text-sm text-muted-foreground">{route ? `${route.total_distance_km} km planned · ${route.estimated_time_minutes} min` : "Waiting for a dispatched route"}</p></div><Badge variant="outline">{syncState === "live" ? "Live" : "Pending sync"}</Badge></CardHeader><CardContent className="flex flex-1 flex-col"><div className="relative flex min-h-[360px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-green-200 bg-green-50"><div className="absolute inset-8 rounded-full border border-dashed border-green-300" /><div className="absolute left-[20%] top-[35%] h-4 w-4 rounded-full bg-brand shadow-[0_0_0_6px_rgba(22,163,74,0.15)]" /><div className="absolute right-[24%] top-[25%] h-4 w-4 rounded-full bg-amber-500 shadow-[0_0_0_6px_rgba(245,158,11,0.15)]" /><div className="absolute bottom-[25%] right-[32%] h-4 w-4 rounded-full bg-brand shadow-[0_0_0_6px_rgba(22,163,74,0.15)]" /><div className="z-10 rounded-lg border border-white bg-white/90 px-4 py-3 text-center shadow-sm"><Navigation className="mx-auto mb-2 h-5 w-5 text-brand" /><p className="text-sm font-medium">{nextStop ? `Next: ${nextStop.bin?.location_name ?? nextStop.bin_id}` : "Route complete"}</p><p className="mt-1 text-xs text-muted-foreground">Navigation handoff available</p></div></div><div className="mt-4 flex items-center justify-between text-sm"><span className="text-muted-foreground">Collection progress</span><span className="font-semibold">{completed} of {stops.length} stops</span></div><Progress className="mt-2" value={progress} /></CardContent></Card>
        <Card className="col-span-5 flex min-h-[560px] flex-col"><CardHeader><CardTitle>Ordered stops</CardTitle><p className="text-sm text-muted-foreground">Select the next stop to act.</p></CardHeader><CardContent className="flex flex-1 flex-col gap-3 overflow-y-auto">{stops.length ? stops.map((stop) => <div key={stop.id} className={`rounded-lg border p-4 ${nextStop?.id === stop.id ? "border-brand bg-brand-muted/40" : "border-border"}`}><div className="flex items-start gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">{stop.sequence_order}</div><div className="min-w-0 flex-1"><p className="font-medium">{stop.bin?.location_name ?? stop.bin_id}</p><p className="mt-1 text-sm text-muted-foreground">{stop.bin?.waste_type ?? "Waste"} · {stop.planned_load_kg} kg planned</p></div><Badge variant={stop.status === "completed" || stop.status === "picked_up" ? "default" : "outline"}>{displayStopStatus(stop.status)}</Badge></div>{nextStop?.id === stop.id && <div className="mt-4 grid grid-cols-3 gap-2"><Button size="sm" variant="outline" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.bin?.location_name ?? stop.bin_id)}`, "_blank")}><Navigation className="mr-1 h-3.5 w-3.5" />Navigate</Button><Button size="sm" onClick={() => nav("pickup")}><Check className="mr-1 h-3.5 w-3.5" />Confirm pickup</Button><Button size="sm" variant="outline" onClick={() => nav("issue")}><CircleAlert className="mr-1 h-3.5 w-3.5" />Issue</Button></div>}</div>) : <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">No assigned stops yet.</div>}<div className="mt-auto flex gap-2 pt-3">{route?.status === "dispatched" && <Button className="flex-1" onClick={() => void updateRoute("accepted")} disabled={busy}>Accept assignment</Button>}{route?.status === "accepted" && <Button className="flex-1" onClick={() => void updateRoute("active")} disabled={busy}>Start route</Button>}<Button variant="outline" onClick={() => nav("unload")}><PackageCheck className="mr-2 h-4 w-4" />Unload</Button></div></CardContent></Card>
      </section>}
      {screen === "pickup" && <Card><CardHeader><CardTitle>Confirm pickup</CardTitle><p className="text-sm text-muted-foreground">Only this confirmation creates the collection record.</p></CardHeader><CardContent className="grid max-w-3xl grid-cols-2 gap-5"><div className="col-span-2 rounded-lg bg-muted p-4"><p className="font-medium">{nextStop?.bin?.location_name ?? "No pending stop"}</p><p className="text-sm text-muted-foreground">{nextStop?.bin?.waste_type ?? "Waste"} · prior fill {nextStop?.bin?.fill_percentage ?? 0}%</p></div><label className="space-y-2 text-sm font-medium">Measured or estimated weight (kg)<Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.0" /></label><label className="space-y-2 text-sm font-medium">Residual fill (%)<Input inputMode="decimal" value={residual} onChange={(e) => setResidual(e.target.value)} /></label><div className="col-span-2 flex gap-3"><Button className="h-12" onClick={() => void submitPickup()} disabled={busy || !nextStop || !weight}>{busy ? "Saving..." : "Confirm pickup"}</Button><Button variant="outline" className="h-12" onClick={() => nav("issue")}>Report issue</Button></div></CardContent></Card>}
      {screen === "unload" && <Card><CardHeader><CardTitle>Unload vehicle</CardTitle><p className="text-sm text-muted-foreground">Record a full or partial facility receipt.</p></CardHeader><CardContent className="grid max-w-3xl grid-cols-2 gap-5"><label className="col-span-2 space-y-2 text-sm font-medium">Facility<Select value={facilityId} onValueChange={(value) => value && setFacilityId(value)}><SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger><SelectContent>{facilities.map((facility) => <SelectItem key={facility.id} value={facility.id}>{facility.name}</SelectItem>)}</SelectContent></Select></label><label className="space-y-2 text-sm font-medium">Quantity unloaded (kg)<Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={`Up to ${vehicle?.current_load_kg ?? 0} kg`} /></label><div className="flex items-end gap-2"><Button variant="outline" className="h-10" onClick={() => setWeight(String(vehicle?.current_load_kg ?? 0))}>Full load</Button><Button className="h-10" onClick={() => void submitUnload()} disabled={busy || !facilityId || !weight}>{busy ? "Saving..." : "Save receipt"}</Button></div></CardContent></Card>}
      {screen === "history" && <section className="space-y-6"><div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} placeholder="Search routes, receipts or facilities" /></div><Card><CardHeader><CardTitle>Previous routes</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Route</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Distance</th><th className="px-3 py-3">Created</th></tr></thead><tbody>{filteredRoutes.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="px-3 py-3 font-medium">{item.id}</td><td className="px-3 py-3"><Badge variant="outline">{item.status}</Badge></td><td className="px-3 py-3">{item.total_distance_km} km</td><td className="px-3 py-3 text-muted-foreground">{new Date((item as RoutePlan & { created_at?: string }).created_at ?? Date.now()).toLocaleDateString()}</td></tr>)}</tbody></table>{!filteredRoutes.length && <p className="py-8 text-center text-sm text-muted-foreground">No route records match your search.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Unloading receipts</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Receipt</th><th className="px-3 py-3">Facility</th><th className="px-3 py-3">Net quantity</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{filteredReceipts.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="px-3 py-3 font-medium">{item.id}</td><td className="px-3 py-3">{item.facility_name}</td><td className="px-3 py-3">{item.net_weight_kg} kg</td><td className="px-3 py-3"><Badge variant="outline">{item.acceptance_status}</Badge></td></tr>)}</tbody></table>{!filteredReceipts.length && <p className="py-8 text-center text-sm text-muted-foreground">No receipt records match your search.</p>}</CardContent></Card></section>}
    </div>
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background px-2 py-2 md:hidden"><div className="mx-auto grid max-w-2xl grid-cols-4 gap-1">{([['shift', 'My Shift'], ['route', 'My Route'], ['unload', 'Unloading'], ['activity', 'Activity']] as const).map(([id, label]) => <button key={id} className={`min-h-12 rounded-lg px-1 text-[11px] ${primaryScreen === id ? "bg-brand-muted font-semibold text-brand" : "text-muted-foreground"}`} onClick={() => openPrimary(id)}>{label}{id === "activity" && alerts.some((alert) => !alert.is_read) ? " •" : ""}</button>)}</div></nav>
  </main>;
}