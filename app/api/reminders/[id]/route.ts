import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { task_name, user_phone, scheduled_time, status } = body;

  const updates: Record<string, unknown> = {};
  if (task_name) updates.task_name = task_name;
  if (user_phone) updates.user_phone = user_phone.startsWith('+') ? user_phone : `+1${user_phone.replace(/\D/g, '')}`;
  if (scheduled_time) updates.scheduled_time = scheduled_time;
  if (status) updates.status = status;
  if (body.repeat !== undefined) updates.repeat = body.repeat;

  const { data, error } = await supabase
    .from('reminders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { error } = await supabase.from('reminders').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
