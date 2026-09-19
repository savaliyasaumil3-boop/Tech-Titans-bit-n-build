import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RegistrationInput = {
  vehicle_number: string;
  vehicle_type: string;
  capacity_kg: number;
  supported_waste_streams: string[];
  service_area: string;
  depot: string;
  latitude: number;
  longitude: number;
  existing_driver_id?: string;
  driver_name?: string;
  driver_email?: string;
  driver_phone?: string;
  temporary_password?: string;
};

function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server Supabase credentials are not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const admin = adminClient();
    const { data: caller, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !caller.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    const { data: supervisor, error: supervisorError } = await admin.from("profiles").select("role").eq("id", caller.user.id).single();
    if (supervisorError || supervisor?.role !== "supervisor") return NextResponse.json({ error: "Supervisor access required." }, { status: 403 });

    const input = (await request.json()) as RegistrationInput;
    if (!input.vehicle_number?.trim() || !input.vehicle_type?.trim() || !input.capacity_kg || !input.service_area?.trim() || !input.depot?.trim()) {
      return NextResponse.json({ error: "Vehicle number, type, capacity, service area, and depot are required." }, { status: 400 });
    }

    let driverId = input.existing_driver_id ?? "";
    let driverName = input.driver_name?.trim() ?? "";
    if (input.existing_driver_id) {
      const { data: existing, error } = await admin.from("profiles").select("id, role, full_name, driver_id").eq("id", input.existing_driver_id).single();
      if (error || existing?.role !== "driver") return NextResponse.json({ error: "Selected account is not an active driver." }, { status: 400 });
      driverName = existing.full_name ?? driverName;
    } else {
      if (!input.driver_email?.trim() || !input.temporary_password || !driverName) return NextResponse.json({ error: "New drivers require name, email, and a temporary password." }, { status: 400 });
      const { data: created, error } = await admin.auth.admin.createUser({ email: input.driver_email.trim().toLowerCase(), password: input.temporary_password, email_confirm: true, user_metadata: { full_name: driverName } });
      if (error || !created.user) return NextResponse.json({ error: error?.message ?? "Unable to create driver account." }, { status: 400 });
      driverId = created.user.id;
      const { error: profileError } = await admin.from("profiles").insert({ id: driverId, role: "driver", full_name: driverName, driver_id: `DRIVER-${created.user.id.slice(0, 8).toUpperCase()}`, phone: input.driver_phone ?? null, must_change_password: true, is_active: true });
      if (profileError) {
        await admin.auth.admin.deleteUser(driverId);
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }
    }

    const { data: profile } = await admin.from("profiles").select("driver_id").eq("id", driverId).single();
    const vehicleId = `VH-${input.vehicle_number.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-12)}`;
    const { data: vehicle, error: vehicleError } = await admin.from("vehicles").insert({ id: vehicleId, vehicle_number: input.vehicle_number.trim(), vehicle_type: input.vehicle_type.trim(), capacity_kg: input.capacity_kg, current_load_kg: 0, latitude: input.latitude ?? 0, longitude: input.longitude ?? 0, status: "available", driver_name: driverName, supported_waste_streams: input.supported_waste_streams ?? [], service_area: input.service_area.trim(), depot: input.depot.trim(), is_operational: true, duty_status: "off_duty", location_updated_at: null }).select("*").single();
    if (vehicleError) return NextResponse.json({ error: vehicleError.message }, { status: 400 });
    const { error: linkError } = await admin.from("profiles").update({ vehicle_id: vehicleId }).eq("id", driverId);
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 });
    return NextResponse.json({ vehicle, driver_id: driverId, operational_driver_id: profile?.driver_id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed." }, { status: 500 });
  }
}