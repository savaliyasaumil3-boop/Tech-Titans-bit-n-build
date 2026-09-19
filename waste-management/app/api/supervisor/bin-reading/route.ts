import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ReadingInput = { bin_id: string; fill_percentage: number; measured_weight_kg?: number; estimated_weight_kg?: number; reading_source: "sensor" | "manual" | "verified_complaint"; sensor_status?: string; idempotency_key?: string };

function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server Supabase credentials are not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const admin = adminClient();
    const { data: caller } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    if (!caller.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile } = await admin.from("profiles").select("role").eq("id", caller.user.id).single();
    if (profile?.role !== "supervisor") return NextResponse.json({ error: "Supervisor access required." }, { status: 403 });

    const input = (await request.json()) as ReadingInput;
    if (!input.bin_id || !Number.isFinite(input.fill_percentage) || input.fill_percentage < 0 || input.fill_percentage > 100) return NextResponse.json({ error: "A valid bin and fill percentage are required." }, { status: 400 });
    const { data: bin, error: binError } = await admin.from("bins").select("*").eq("id", input.bin_id).single();
    if (binError || !bin) return NextResponse.json({ error: "Bin not found." }, { status: 404 });
    const readingId = `READING-${input.idempotency_key ?? `${input.bin_id}-${Date.now()}`}`;
    const { error: readingError } = await admin.from("bin_readings").insert({ id: readingId, bin_id: input.bin_id, fill_percentage: input.fill_percentage, measured_weight_kg: input.measured_weight_kg ?? null, estimated_weight_kg: input.estimated_weight_kg ?? null, reading_source: input.reading_source, sensor_status: input.sensor_status ?? "healthy", recorded_by: caller.user.id, idempotency_key: input.idempotency_key ?? null });
    if (readingError && !readingError.message.includes("duplicate")) return NextResponse.json({ error: readingError.message }, { status: 400 });

    const status = input.fill_percentage >= 80 ? "critical" : input.fill_percentage >= 50 ? "warning" : "healthy";
    await admin.from("bins").update({ fill_percentage: input.fill_percentage, current_fill_kg: input.measured_weight_kg ?? Math.round((input.fill_percentage / 100) * bin.capacity_kg * 10) / 10, status, reading_source: input.reading_source, sensor_status: input.sensor_status ?? "healthy", reading_recorded_at: new Date().toISOString(), last_updated: new Date().toISOString() }).eq("id", input.bin_id);
    if (input.fill_percentage < 80) return NextResponse.json({ status: "healthy", request: null, alert: null });

    const { data: existingRequest } = await admin.from("collection_requests").select("*").eq("bin_id", input.bin_id).in("status", ["unassigned", "assigned", "accepted", "in_progress", "partially_completed"]).maybeSingle();
    const requestRecord = existingRequest ?? (await admin.from("collection_requests").insert({ id: `REQ-${input.bin_id}`, bin_id: input.bin_id, urgency: input.fill_percentage >= 90 ? "urgent" : "high", reason: "fill_threshold", required_quantity_kg: input.measured_weight_kg ?? Math.round((input.fill_percentage / 100) * bin.capacity_kg), waste_stream: bin.waste_type, status: "unassigned" }).select("*").single()).data;
    if (!requestRecord) return NextResponse.json({ error: "Unable to create collection request." }, { status: 500 });
    const alertId = `ALERT-REQ-${requestRecord.id}`;
    await admin.from("alerts").upsert({ id: alertId, bin_id: input.bin_id, collection_request_id: requestRecord.id, type: "overflow", severity: input.fill_percentage >= 90 ? "critical" : "warning", message: `${input.bin_id} at ${bin.location_name} requires collection (${input.fill_percentage}% full).`, is_read: false }, { onConflict: "id" });

    if (!requestRecord.assigned_vehicle_id) {
      const { data: vehicles } = await admin.from("vehicles").select("*").eq("is_operational", true).eq("duty_status", "on_duty").in("status", ["available", "collecting"]);
      const { data: shifts } = await admin.from("driver_shifts").select("driver_id, vehicle_id, last_location_at").eq("status", "on_duty").in("vehicle_id", (vehicles ?? []).map((vehicle) => vehicle.id));
      const eligible = (vehicles ?? []).map((vehicle) => ({ vehicle, shift: (shifts ?? []).find((item) => item.vehicle_id === vehicle.id) })).filter(({ vehicle, shift }) => shift && vehicle.capacity_kg - vehicle.current_load_kg >= Number(requestRecord.required_quantity_kg) && (!vehicle.service_area || vehicle.service_area === bin.service_area));
      if (eligible.length) {
        eligible.sort((a, b) => (a.vehicle.current_load_kg / a.vehicle.capacity_kg) - (b.vehicle.current_load_kg / b.vehicle.capacity_kg));
        const selected = eligible[0];
        const { data: driver } = await admin.from("profiles").select("driver_id").eq("vehicle_id", selected.vehicle.id).eq("role", "driver").single();
        const routeId = `ROUTE-AUTO-${requestRecord.id}`;
        await admin.from("route_plans").upsert({ id: routeId, vehicle_id: selected.vehicle.id, driver_id: driver?.driver_id, status: "dispatched", dispatch_mode: "auto", assignment_version: 1, total_distance_km: 0, estimated_time_minutes: 0, stops_json: [{ id: input.bin_id }], dispatched_at: new Date().toISOString() }, { onConflict: "id" });
        await admin.from("route_stops").upsert({ id: `${routeId}-${input.bin_id}`, route_plan_id: routeId, bin_id: input.bin_id, sequence_order: 1, planned_load_kg: requestRecord.required_quantity_kg, estimated_quantity_kg: requestRecord.required_quantity_kg, status: "pending" }, { onConflict: "id" });
        await admin.from("stop_checklist_items").upsert([
          { id: `${routeId}-${input.bin_id}-verify`, route_plan_id: routeId, route_stop_id: `${routeId}-${input.bin_id}`, driver_id: driver?.driver_id, checklist_key: "verify_bin", label: "Verify the bin ID and location", is_required: true },
          { id: `${routeId}-${input.bin_id}-inspect`, route_plan_id: routeId, route_stop_id: `${routeId}-${input.bin_id}`, driver_id: driver?.driver_id, checklist_key: "inspect_waste", label: "Inspect waste type and access safety", is_required: true },
          { id: `${routeId}-${input.bin_id}-record`, route_plan_id: routeId, route_stop_id: `${routeId}-${input.bin_id}`, driver_id: driver?.driver_id, checklist_key: "record_reading", label: "Record weight and residual fill", is_required: true },
          { id: `${routeId}-${input.bin_id}-secure`, route_plan_id: routeId, route_stop_id: `${routeId}-${input.bin_id}`, driver_id: driver?.driver_id, checklist_key: "secure_area", label: "Secure the area before leaving", is_required: true }
        ], { onConflict: "route_stop_id,checklist_key" });
        await admin.from("collection_requests").update({ assigned_vehicle_id: selected.vehicle.id, assigned_route_id: routeId, status: "assigned", reservation_kg: requestRecord.required_quantity_kg, updated_at: new Date().toISOString() }).eq("id", requestRecord.id);
        await admin.from("alerts").upsert({ id: `ALERT-ASSIGN-${requestRecord.id}`, vehicle_id: selected.vehicle.id, collection_request_id: requestRecord.id, type: "system", severity: "info", message: `New assignment: ${input.bin_id} is ready for acceptance.`, is_read: false }, { onConflict: "id" });
        return NextResponse.json({ status, request: { ...requestRecord, assigned_vehicle_id: selected.vehicle.id, assigned_route_id: routeId }, alert: alertId, assigned: true });
      }
      await admin.from("collection_requests").update({ unassigned_reason: "No on-duty operational vehicle with compatible area and capacity." }).eq("id", requestRecord.id);
    }
    return NextResponse.json({ status, request: requestRecord, alert: alertId, assigned: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reading ingestion failed." }, { status: 500 });
  }
}