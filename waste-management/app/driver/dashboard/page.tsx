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
type DriverIssue = {
  id: string;
  issue_type: string;
  notes: string;
  status: string;
  created_at: string;
  route_plan_id?: string | null;
  stop_id?: string | null;
  vehicle_id?: string | null;
  bin_id?: string | null;
  bin_name?: string | null;
  vehicle_number?: string | null;
  assistance_request?: string | null;
  photo_path?: string | null;
  location_name?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_accuracy_m?: number | null;
  location_freshness?: string | null;
  supervisor_response?: string | null;
  resolution_notes?: string | null;
  status_history?: Array<{ status: string; note: string; timestamp: string }> | null;
  driver_reply?: string | null;
  is_unresolved?: boolean | null;
};
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

const issueCategoryOptions = [
  { value: "blocked_access", label: "Blocked access or locked premises" },
  { value: "missing_bin", label: "Missing/damaged bin" },
  { value: "unsafe_waste", label: "Unsafe or incompatible waste" },
  { value: "insufficient_capacity", label: "Insufficient vehicle capacity" },
  { value: "vehicle_breakdown", label: "Vehicle breakdown" },
  { value: "facility_closed", label: "Facility closed or refusing waste" },
  { value: "other", label: "Other" },
] as const;

const assistanceRequestOptions = [
  { value: "reschedule_pickup", label: "Reschedule pickup" },
  { value: "assign_another_vehicle", label: "Assign another vehicle" },
  { value: "arrange_maintenance", label: "Arrange maintenance" },
  { value: "contact_supervisor", label: "Contact supervisor" },
] as const;

function normalizeIssueStatus(status: string | null | undefined) {
  const value = (status ?? "").toLowerCase();
  if (value.includes("resolved")) return "Resolved";
  if (value.includes("in progress") || value.includes("in_progress") || value.includes("progress")) return "In Progress";
  if (value.includes("acknowledged") || value.includes("accepted")) return "Acknowledged";
  if (value.includes("submitted") || value.includes("open") || value.includes("new") || value.includes("pending sync") || value.includes("pending_sync")) return "Submitted";
  if (value.includes("pending")) return "Pending Sync";
  return "Submitted";
}

function parseIssueHistory(value: unknown) {
  if (Array.isArray(value)) return value as Array<{ status: string; note: string; timestamp: string }>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

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

async function requestDriverLocationPermission(
  client: typeof supabase,
  profile: { driver_id?: string | null; id?: string | null } | null,
  vehicleId?: string | null,
  shiftId?: string | null,
  onFresh?: (lat: number, lng: number) => void,
) {
  if (!client || !profile?.driver_id || !vehicleId || !navigator.geolocation) return false;

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 10000,
      });
    });

    const recordedAt = new Date().toISOString();
    const payload = {
      vehicle_id: vehicleId,
      driver_id: profile.driver_id,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy_m: position.coords.accuracy,
      recorded_at: recordedAt,
    };

    const locationInsert = await client.from("vehicle_locations").insert(payload);
    if (locationInsert.error) {
      console.warn("Location insert failed:", locationInsert.error.message);
    }

    if (shiftId) {
      const shiftUpdate = await client.from("driver_shifts").update({
        last_location_lat: position.coords.latitude,
        last_location_lng: position.coords.longitude,
        last_location_at: recordedAt,
      }).eq("id", shiftId).eq("driver_id", profile.driver_id);
      if (shiftUpdate.error) {
        console.warn("Shift GPS update failed:", shiftUpdate.error.message);
      }
    }

    const vehicleUpdate = await client.from("vehicles").update({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      location_updated_at: recordedAt,
      last_updated: recordedAt,
    }).eq("id", vehicleId);
    if (vehicleUpdate.error) {
      console.warn("Vehicle GPS update failed:", vehicleUpdate.error.message);
    }

    onFresh?.(position.coords.latitude, position.coords.longitude);
    return true;
  } catch (error) {
    console.warn("Driver GPS access not granted:", error);
    return false;
  }
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
  const [issuePhoto, setIssuePhoto] = useState("");
  const [assistanceRequest, setAssistanceRequest] = useState("contact_supervisor");
  const [issueTab, setIssueTab] = useState<"open" | "resolved">("open");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueSaveState, setIssueSaveState] = useState<"idle" | "saving" | "success" | "error" | "pending">("idle");
  const [reportReply, setReportReply] = useState("");
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
  const gpsActivationAttemptedRef = useRef(false);

  const refresh = async () => {
    if (!supabase || !profile?.driver_id) return;
    setSyncState("pending");
    const { data: routeData } = await supabase.from("route_plans").select("*").eq("driver_id", profile.driver_id).in("status", ["dispatched", "accepted", "active", "in_progress", "assigned"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
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
    const { data: issueHistory } = await supabase.from("route_issues").select("id, route_plan_id, stop_id, vehicle_id, driver_id, issue_type, notes, status, created_at, bin_id, bin_name, vehicle_number, assistance_request, photo_path, location_name, location_freshness, supervisor_response, resolution_notes, driver_reply, status_history, is_unresolved").eq("driver_id", profile.driver_id).order("created_at", { ascending: false }).limit(20);
    const issueRows = Array.isArray(issueHistory) ? (issueHistory as DriverIssue[]) : [];
    setIssues(issueRows.map((issue) => ({
      ...issue,
      status: normalizeIssueStatus(issue.status),
      issue_type: issue.issue_type || "other",
      bin_name: issue.bin_name ?? nextStop?.bin?.location_name ?? "Current stop",
      location_freshness: issue.location_freshness ?? (shift?.last_location_at ? (Date.now() - new Date(shift.last_location_at).getTime() <= 5 * 60 * 1000 ? "fresh" : "stale") : "unknown"),
    })));
    if (!selectedIssueId && issueRows.length) {
      setSelectedIssueId(issueRows[0]?.id ?? null);
    }
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
    if (authLoading || !profile || profile.role !== "driver" || !supabase || gpsActivationAttemptedRef.current) return;

    gpsActivationAttemptedRef.current = true;
    void requestDriverLocationPermission(
      supabase,
      profile,
      vehicle?.id ?? profile.vehicle_id ?? null,
      shift?.id ?? null,
      (lat, lng) => {
        setLocationState("fresh");
        setNotice(`GPS enabled. Live position captured at ${lat.toFixed(4)}, ${lng.toFixed(4)}.`);
      }
    );
  }, [authLoading, profile, supabase, vehicle?.id, shift?.id]);

  useEffect(() => {
    if (!supabase || !profile?.driver_id) return;
    const channel = supabase.channel(`driver-${profile.driver_id}`).on("postgres_changes", { event: "*", schema: "public", table: "route_plans", filter: `driver_id=eq.${profile.driver_id}` }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "route_stops" }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `vehicle_id=eq.${profile.vehicle_id}` }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "route_issues", filter: `driver_id=eq.${profile.driver_id}` }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "collection_events", filter: `driver_id=eq.${profile.driver_id}` }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "facility_receipts", filter: `driver_id=eq.${profile.driver_id}` }, refresh).subscribe();
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
  const openReports = issues.filter((issue) => normalizeIssueStatus(issue.status) !== "Resolved");
  const resolvedReports = issues.filter((issue) => normalizeIssueStatus(issue.status) === "Resolved");
  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId) ?? issues[0] ?? null;

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
    if (error) { setSyncState("error"); setNotice(error.message); } else {
      const nextShift = data as DriverShift;
      setShift(nextShift);
      await requestDriverLocationPermission(client, profile, vehicle.id, nextShift.id, (lat, lng) => {
        setLocationState("fresh");
        setNotice(`Shift started. GPS is live and the truck is currently at ${lat.toFixed(4)}, ${lng.toFixed(4)}.`);
      });
      setNotice("Shift started. GPS is now active for live vehicle tracking.");
      await refresh();
    }
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

  const isSchemaCompatibilityError = (message: string) => /does not exist|column .* does not exist|unknown column|property .* does not exist|invalid input syntax/i.test(message.toLowerCase());

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

    const collectionPayload = {
      id: pickupId,
      bin_id: nextStop.bin_id,
      vehicle_id: vehicle.id,
      driver_id: profile.driver_id,
      route_plan_id: route.id,
      stop_id: nextStop.id,
      collected_weight_kg: collectedWeight,
      residual_fill_percentage: residualFill,
      measurement_method: pickupMode,
      collection_outcome: pickupOutcome,
      remaining_waste_kg: remainingWaste,
      collection_notes: pickupNote.trim() || null,
      status: "completed",
      collected_at: new Date().toISOString(),
    };

    const legacyCollectionPayload = {
      id: pickupId,
      bin_id: nextStop.bin_id,
      vehicle_id: vehicle.id,
      driver_id: profile.driver_id,
      route_plan_id: route.id,
      stop_id: nextStop.id,
      collected_weight_kg: collectedWeight,
      residual_fill_percentage: residualFill,
      collection_notes: pickupNote.trim() || null,
      status: "completed",
      collected_at: new Date().toISOString(),
    };

    let collectionWriteError: Error | null = null;

    try {
      const insertResult = await client.from("collection_events").insert(collectionPayload);
      if (insertResult.error) {
        if (!isSchemaCompatibilityError(insertResult.error.message)) throw insertResult.error;
        const fallbackResult = await client.from("collection_events").insert(legacyCollectionPayload);
        if (fallbackResult.error) throw fallbackResult.error;
      }
    } catch (error) {
      collectionWriteError = error instanceof Error ? error : new Error("Failed to save pickup.");
    }

    const stopStatus = pickupOutcome === "partial" ? "partial" : "picked_up";
    const stopUpdate = await client.from("route_stops").update({ status: stopStatus, collection_event_id: pickupId, updated_at: new Date().toISOString() }).eq("id", nextStop.id).eq("route_plan_id", route.id);
    setStops((currentStops) => currentStops.map((stop) => stop.id === nextStop.id ? { ...stop, status: stopStatus, collection_event_id: pickupId, updated_at: new Date().toISOString() } : stop));
    const pickupLocation = nextStop.bin ? { latitude: nextStop.bin.latitude, longitude: nextStop.bin.longitude } : { latitude: vehicle.latitude, longitude: vehicle.longitude };
    const vehicleUpdate = await client.from("vehicles").update({
      current_load_kg: vehicle.current_load_kg + collectedWeight,
      status: "collecting",
      latitude: pickupLocation.latitude,
      longitude: pickupLocation.longitude,
      location_updated_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    }).eq("id", vehicle.id);
    if (shift) {
      await client.from("driver_shifts").update({
        last_location_lat: pickupLocation.latitude,
        last_location_lng: pickupLocation.longitude,
        last_location_at: new Date().toISOString(),
      }).eq("id", shift.id).eq("driver_id", profile.driver_id);
    }
    const binUpdate = await client.from("bins").update({
      fill_percentage: residualFill,
      current_fill_kg: Math.round((residualFill / 100) * nextStop.bin!.capacity_kg * 10) / 10,
      status: "picked_up",
      last_updated: new Date().toISOString(),
    }).eq("id", nextStop.bin_id);
    const { data: request } = await client.from("collection_requests").select("id, status, assigned_vehicle_id, assigned_route_id, reservation_kg").eq("assigned_route_id", route.id).eq("bin_id", nextStop.bin_id).maybeSingle();
    if (request) {
      const nextRequestStatus = pickupOutcome === "partial" ? "partially_completed" : "picked_up";
      await client.from("collection_requests").update({
        status: nextRequestStatus,
        assigned_vehicle_id: pickupOutcome === "partial" ? request.assigned_vehicle_id : null,
        assigned_route_id: pickupOutcome === "partial" ? request.assigned_route_id : null,
        reservation_kg: pickupOutcome === "partial" ? request.reservation_kg ?? 0 : 0,
        resolved_at: pickupOutcome === "partial" ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", request.id);
    }
    if (stopUpdate.error || vehicleUpdate.error || binUpdate.error) setNotice("Pickup was recorded, but a live state update needs supervisor review.");
    await addMetric({ collected_quantity_kg: collectedWeight, ...(pickupOutcome === "partial" ? { partial_stops: 1 } : { completed_stops: 1 }) });

    if (collectionWriteError) {
      setSyncState("pending");
      setNotice("Pickup was marked complete on the route, but the database schema still needs the newer collection columns migrated.");
    } else {
      setNotice(pickupOutcome === "partial" ? "Partial pickup saved and synced." : "Pickup saved and synced.");
    }
    setWeight(""); setResidual("0"); setBinConfirmation(""); setPickupNote(""); await refresh(); setScreen("route");
    setBusy(false);
  };

  const submitIssue = async () => {
    const client = supabase;
    if (!client || !vehicle || !route || !nextStop || !issueNote.trim()) return;
    setBusy(true);
    setIssueSaveState("saving");
    setSyncState("pending");

    const locationName = nextStop.bin?.location_name ?? nextStop.bin_id;
    const locationFreshness = locationState === "fresh" ? "fresh" : locationState === "stale" ? "stale" : "unknown";
    const issueId = `ISSUE-${route.id}-${nextStop.id}-${issueType}-${Date.now()}`;
    const existingIssue = issues.find((item) => item.route_plan_id === route.id && item.stop_id === nextStop.id && item.issue_type === issueType && item.status !== "Resolved");
    if (existingIssue) {
      setNotice("This issue is already open for the selected stop. Please review the open report instead.");
      setSelectedIssueId(existingIssue.id);
      setIssueSaveState("pending");
      setBusy(false);
      return;
    }

    const timestamp = new Date().toISOString();
    const issuePayload = {
      id: issueId,
      route_plan_id: route.id,
      stop_id: nextStop.id,
      vehicle_id: vehicle.id,
      driver_id: profile.driver_id,
      issue_type: issueType,
      notes: issueNote.trim(),
      status: "Submitted",
      bin_id: nextStop.bin_id,
      bin_name: locationName,
      vehicle_number: vehicle.vehicle_number,
      assistance_request: assistanceRequest,
      photo_path: issuePhoto.trim() || null,
      location_name: locationName,
      location_freshness: locationFreshness,
      location_accuracy_m: vehicle.last_updated ? 12 : null,
      status_history: JSON.stringify([{ status: "Submitted", note: "Issue reported by driver.", timestamp }]),
      is_unresolved: true,
      created_at: timestamp,
    };

    const issueInsert = await client.from("route_issues").insert(issuePayload);
    if (issueInsert.error && isSchemaCompatibilityError(issueInsert.error.message)) {
      const fallbackInsert = await client.from("route_issues").insert({
        id: issueId,
        route_plan_id: route.id,
        stop_id: nextStop.id,
        vehicle_id: vehicle.id,
        driver_id: profile.driver_id,
        issue_type: issueType,
        notes: issueNote.trim(),
        status: "Submitted",
        bin_id: nextStop.bin_id,
        bin_name: locationName,
        vehicle_number: vehicle.vehicle_number,
      });
      if (fallbackInsert.error) {
        setSyncState("error");
        setIssueSaveState("error");
        setNotice(fallbackInsert.error.message);
        setBusy(false);
        return;
      }
    } else if (issueInsert.error) {
      setSyncState("error");
      setIssueSaveState("error");
      setNotice(issueInsert.error.message);
      setBusy(false);
      return;
    }

    await client.from("alerts").insert({
      id: `SUPERVISOR-${issueId}`,
      vehicle_id: vehicle.id,
      type: issueType,
      severity: "warning",
      message: `Driver report: ${locationName} - ${issueNote.trim()}`,
      is_read: false,
      created_at: timestamp,
    });

    if (issueType === "blocked_access") {
      await client.from("route_stops").update({ status: "blocked", updated_at: timestamp }).eq("id", nextStop.id).eq("status", "pending");
      await client.from("collection_requests").update({ status: "unassigned", assigned_vehicle_id: null, assigned_route_id: null, reservation_kg: 0, unassigned_reason: issueNote.trim(), updated_at: timestamp }).eq("assigned_route_id", route.id).eq("bin_id", nextStop.bin_id);
      await addMetric({ blocked_stops: 1 });
    }

    setIssueSaveState("success");
    setNotice("Issue submitted successfully. The supervisor has been notified.");
    setIssueNote("");
    setIssuePhoto("");
    setAssistanceRequest("contact_supervisor");
    setSelectedIssueId(issueId);
    setIssueTab("open");
    setActivityTab("reports");
    setScreen("history");
    await refresh();
    setBusy(false);
  };

  const saveIssueReply = async (issue: DriverIssue) => {
    if (!supabase || !issue || !reportReply.trim()) return;
    setBusy(true);
    setSyncState("pending");
    const payload = {
      driver_reply: reportReply.trim(),
      is_unresolved: true,
      status: "In Progress",
      status_history: JSON.stringify([
        ...(Array.isArray(issue.status_history) ? issue.status_history : []),
        { status: "In Progress", note: "Driver flagged the issue remains unresolved.", timestamp: new Date().toISOString() },
      ]),
    };
    const { error } = await supabase.from("route_issues").update(payload).eq("id", issue.id).eq("driver_id", profile.driver_id);
    if (error) {
      setSyncState("error");
      setNotice(error.message);
    } else {
      setNotice("Supervisor follow-up noted. The report remains open until the issue is resolved.");
      setReportReply("");
      await refresh();
    }
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

    const receiptPayload = {
      id: receiptId,
      facility_id: facilityId,
      vehicle_id: vehicle.id,
      driver_id: profile.driver_id,
      facility_name: facility?.name ?? "Selected facility",
      gross_weight_kg: unloadedWeight,
      net_weight_kg: unloadedWeight,
      accepted_waste_type: "Mixed recyclable",
      acceptance_status: unloadAcceptance,
      receipt_reference: receiptReference.trim() || null,
      material_breakdown: unloadNote.trim() ? { note: unloadNote.trim() } : {},
      status: unloadAcceptance === "accepted" ? "processed" : "rejected",
    };

    const receiptInsert = await client.from("facility_receipts").insert(receiptPayload);
    if (receiptInsert.error && isSchemaCompatibilityError(receiptInsert.error.message)) {
      const fallbackInsert = await client.from("facility_receipts").insert({
        id: receiptId,
        facility_id: facilityId,
        vehicle_id: vehicle.id,
        driver_id: profile.driver_id,
        facility_name: facility?.name ?? "Selected facility",
        gross_weight_kg: unloadedWeight,
        tare_weight_kg: 0,
        net_weight_kg: unloadedWeight,
        material_breakdown: unloadNote.trim() ? { note: unloadNote.trim() } : {},
        acceptance_status: unloadAcceptance,
        status: unloadAcceptance === "accepted" ? "processed" : "rejected",
      });
      if (fallbackInsert.error) {
        setSyncState("error"); setNotice(fallbackInsert.error.message); setBusy(false); return;
      }
    } else if (receiptInsert.error) {
      setSyncState("error"); setNotice(receiptInsert.error.message); setBusy(false); return;
    }

    if (unloadAcceptance === "accepted") await client.from("vehicles").update({ current_load_kg: Math.max(0, vehicle.current_load_kg - unloadedWeight), status: route && stops.some((stop) => ["pending", "partial"].includes(stop.status)) ? "collecting" : "returning", last_updated: new Date().toISOString() }).eq("id", vehicle.id);
    if (unloadAcceptance === "rejected") await client.from("alerts").insert({ id: `UNLOAD-REJECTED-${receiptId}`, vehicle_id: vehicle.id, type: "vehicle", severity: "warning", message: `Facility rejected ${unloadedWeight}kg from receipt ${receiptId}. Load remains on vehicle.`, is_read: false });
    await addMetric(unloadAcceptance === "accepted" ? { unloaded_quantity_kg: unloadedWeight } : { rejected_quantity_kg: unloadedWeight });
    setNotice(unloadAcceptance === "accepted" ? "Unload receipt saved and load updated." : "Rejected receipt saved; load remains on vehicle and supervisor notified."); setWeight(""); setReceiptReference(""); setUnloadNote(""); await refresh(); setScreen(route && stops.some((stop) => ["pending", "partial"].includes(stop.status)) ? "route" : "summary");
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
      {screen === "issue" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" />Report issue</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border border-border bg-muted/40 p-3 text-sm"><p className="font-medium">Current stop</p><p className="mt-1 text-muted-foreground">{nextStop?.bin?.location_name ?? nextStop?.bin_id ?? "No active stop"}</p><p className="mt-1 text-xs text-muted-foreground">Location freshness: {locationState === "fresh" ? "Fresh GPS" : locationState === "stale" ? "Stale GPS" : locationState === "unavailable" ? "GPS unavailable" : "Tracking not started"}</p></div><Select value={issueType} onValueChange={(value) => value && setIssueType(value)}><SelectTrigger><SelectValue placeholder="Select issue type" /></SelectTrigger><SelectContent>{issueCategoryOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><Input value={issueNote} onChange={(e) => setIssueNote(e.target.value)} placeholder="Short description of the issue" /><Select value={assistanceRequest} onValueChange={(value) => value && setAssistanceRequest(value)}><SelectTrigger><SelectValue placeholder="Assistance needed" /></SelectTrigger><SelectContent>{assistanceRequestOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><Input value={issuePhoto} onChange={(e) => setIssuePhoto(e.target.value)} placeholder="Optional photo URL or reference" /><div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">{issueType === "blocked_access" ? "Blocked pickup will stay unresolved until a supervisor records an outcome." : issueType === "vehicle_breakdown" ? "Maintenance request will be routed to the supervisor for dispatch review." : "This report is attached to the active route and vehicle for live follow-up."}</div><Button className="h-12 w-full" onClick={() => void submitIssue()} disabled={busy || !issueNote.trim()}>{issueSaveState === "saving" ? "Submitting..." : issueSaveState === "success" ? "Submitted" : "Send report"}</Button>{issueSaveState === "error" && <p className="text-xs text-red-600">The report did not save. Please retry.</p>}</CardContent></Card>}
      {screen === "unload" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-brand" />Unload vehicle</CardTitle><p className="text-sm text-muted-foreground">Current load: {vehicle?.current_load_kg ?? 0} kg</p></CardHeader><CardContent className="space-y-4"><Select value={facilityId} onValueChange={(value) => value && setFacilityId(value)}><SelectTrigger><SelectValue placeholder="Select approved facility" /></SelectTrigger><SelectContent>{facilities.map((facility) => <SelectItem key={facility.id} value={facility.id}>{facility.name}</SelectItem>)}</SelectContent></Select><div className="grid grid-cols-2 gap-2"><Button type="button" variant={unloadMode === "full" ? "default" : "outline"} onClick={() => { setUnloadMode("full"); setWeight(String(vehicle?.current_load_kg ?? 0)); }}>Full load</Button><Button type="button" variant={unloadMode === "partial" ? "default" : "outline"} onClick={() => setUnloadMode("partial")}>Partial</Button></div><Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Actual quantity unloaded (kg)" /><Input value={receiptReference} onChange={(e) => setReceiptReference(e.target.value)} placeholder="Receipt/reference (optional)" /><Button className="h-12 w-full" onClick={() => void submitUnload()} disabled={busy || !facilityId || !weight}>Save receipt</Button></CardContent></Card>}
      {screen === "summary" && <Card><CardHeader><CardTitle>Shift summary</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-3 text-center"><div className="rounded-lg bg-green-50 p-3"><p className="text-2xl font-semibold text-green-700">{completed}</p><p className="text-xs text-muted-foreground">Completed</p></div><div className="rounded-lg bg-amber-50 p-3"><p className="text-2xl font-semibold text-amber-700">{stops.filter((stop) => stop.status === "skipped").length}</p><p className="text-xs text-muted-foreground">Skipped</p></div><div className="rounded-lg bg-muted p-3"><p className="text-2xl font-semibold">{stops.filter((stop) => stop.status === "pending").length}</p><p className="text-xs text-muted-foreground">Pending</p></div></CardContent></Card>}
      {screen === "history" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-brand" />Activity</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-3 gap-2"><Button size="sm" variant={activityTab === "alerts" ? "default" : "outline"} onClick={() => setActivityTab("alerts")}>Alerts</Button><Button size="sm" variant={activityTab === "reports" ? "default" : "outline"} onClick={() => setActivityTab("reports")}>My Reports</Button><Button size="sm" variant={activityTab === "history" ? "default" : "outline"} onClick={() => setActivityTab("history")}>History</Button></div>{activityTab === "alerts" && <div className="space-y-2">{alerts.slice(0, 5).map((alert) => <div key={alert.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{alert.type.replaceAll("_", " ")}</p><Badge variant="outline">{alert.severity}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{alert.message}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</p></div>)}{!alerts.length && <p className="text-sm text-muted-foreground">No notifications yet.</p>}</div>}{activityTab === "reports" && (() => { const reportList = issueTab === "open" ? openReports : resolvedReports; const activeIssue = (selectedIssue && reportList.some((issue) => issue.id === selectedIssue.id)) ? selectedIssue : reportList[0] ?? null; return <div className="space-y-4"><div className="rounded-xl border bg-muted/30 p-2"><div className="grid grid-cols-2 gap-2"><Button size="sm" variant={issueTab === "open" ? "default" : "outline"} onClick={() => setIssueTab("open")}>Open</Button><Button size="sm" variant={issueTab === "resolved" ? "default" : "outline"} onClick={() => setIssueTab("resolved")}>Resolved</Button></div></div>{reportList.length ? <div className="grid gap-3 lg:grid-cols-[1.1fr_1.5fr]"><div className="space-y-2">{reportList.map((issue) => <button key={issue.id} type="button" onClick={() => setSelectedIssueId(issue.id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedIssueId === issue.id ? "border-brand bg-brand-muted/40" : "border-border bg-background"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{issue.issue_type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{issue.bin_name ?? issue.location_name ?? "Stop"} · {new Date(issue.created_at).toLocaleString()}</p></div><Badge variant="outline">{normalizeIssueStatus(issue.status)}</Badge></div><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{issue.notes}</p></button>)}</div>{activeIssue ? <div className="rounded-xl border bg-background p-3"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">Issue detail</p><h3 className="text-base font-semibold">{activeIssue.issue_type.replaceAll("_", " ")}</h3></div><Badge>{normalizeIssueStatus(activeIssue.status)}</Badge></div><dl className="grid gap-2 text-sm"><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Location</dt><dd className="text-right font-medium">{activeIssue.location_name ?? activeIssue.bin_name ?? "Not recorded"}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Vehicle</dt><dd className="text-right font-medium">{activeIssue.vehicle_number ?? "Vehicle"}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Submitted</dt><dd className="text-right font-medium">{new Date(activeIssue.created_at).toLocaleString()}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Assistance</dt><dd className="text-right font-medium">{activeIssue.assistance_request?.replaceAll("_", " ") ?? "Contact supervisor"}</dd></div></dl><div className="mt-3 rounded-lg border bg-muted/30 p-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Driver note</p><p className="mt-2 text-sm text-foreground">{activeIssue.notes || "No issue note added."}</p>{activeIssue.photo_path && <p className="mt-2 text-xs text-muted-foreground">Photo reference: {activeIssue.photo_path}</p>}</div><div className="mt-3 rounded-lg border bg-muted/30 p-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Supervisor follow-up</p>{activeIssue.supervisor_response ? <p className="mt-2 text-sm text-foreground">{activeIssue.supervisor_response}</p> : <p className="mt-2 text-sm text-muted-foreground">No supervisor response yet. The issue remains open until the supervisor records the next action.</p>}</div>{activeIssue.resolution_notes && <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-xs font-medium uppercase tracking-wide text-green-800">Resolution note</p><p className="mt-2 text-sm text-green-900">{activeIssue.resolution_notes}</p></div>}<div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-medium uppercase tracking-wide text-amber-800">Workflow rules</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900"><li>Do not reopen a route that is already assigned to another driver.</li><li>Blocked or unsafe bins remain unresolved until the supervisor confirms the next action.</li><li>Once a pickup is confirmed, it will no longer appear in active route optimization.</li></ul></div>{(parseIssueHistory(activeIssue.status_history).length || activeIssue.driver_reply || activeIssue.supervisor_response) && <div className="mt-3 space-y-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">History</p><div className="space-y-2">{(parseIssueHistory(activeIssue.status_history).length ? parseIssueHistory(activeIssue.status_history) : [{ status: activeIssue.status, note: activeIssue.notes || "Issue updated.", timestamp: activeIssue.created_at }]).map((entry, index) => <div key={`${entry.status}-${index}`} className="rounded border bg-muted/20 p-2 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-medium">{entry.status}</span><span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span></div><p className="mt-1 text-muted-foreground">{entry.note}</p></div>)}</div></div>}{activeIssue.is_unresolved !== false && <div className="mt-3 space-y-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Follow-up</p><textarea value={reportReply} onChange={(event) => setReportReply(event.target.value)} className="min-h-[90px] w-full rounded-md border border-border bg-background p-3 text-sm" placeholder="Reply to supervisor or add the action taken." /><Button className="w-full" onClick={() => void saveIssueReply(activeIssue)} disabled={busy || !reportReply.trim()}>Send follow-up</Button></div>}</div> : <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No issue selected.</div>}</div> : <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No {issueTab === "open" ? "open" : "resolved"} reports for this driver.</div>}</div> })()}{activityTab === "history" && <div className="space-y-2 text-sm text-muted-foreground"><p>{historyRoutes.length} route records</p><p>{receipts.length} unloading receipts</p><p>Pickup history is preserved in the collection records for each route.</p></div>}<Button variant="outline" className="mt-2" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh activity</Button></CardContent></Card>}
    </div>
    {screen === "route" && nextStop && <div className="mx-auto max-w-2xl space-y-3 px-4 pb-4"><Card><CardHeader><CardTitle>Stop checklist</CardTitle><p className="text-sm text-muted-foreground">Complete required checks before pickup.</p></CardHeader><CardContent className="space-y-2">{nextChecklist.map((item) => <label key={item.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={item.completed} onChange={() => void toggleChecklist(item)} />{item.label}</label>)}<p className={`text-xs ${checklistReady ? "text-green-700" : "text-amber-700"}`}>{checklistReady ? "Checklist complete" : "Required checks remaining"}</p></CardContent></Card></div>}
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