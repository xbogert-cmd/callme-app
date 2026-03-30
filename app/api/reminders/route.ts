import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CategorySettings } from '@/types';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    task_name,
    user_phone,
    scheduled_time,
    category = 'general',
    category_settings = {} as CategorySettings,
    repeat = 'none',
  } = body;

  if (!task_name || !user_phone || !scheduled_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const phone = user_phone.startsWith('+') ? user_phone : `+1${user_phone.replace(/\D/g, '')}`;
  const startTime = new Date(scheduled_time);
  const budgetDate = startTime.toISOString().split('T')[0];

  // Budget: create N evenly-spaced reminders across 12 hours
  if (category === 'budget') {
    const n = Math.min(Math.max(category_settings.checkinsPerDay ?? 1, 1), 4);
    const intervalMins = Math.floor((12 * 60) / n);
    const created = [];

    for (let i = 0; i < n; i++) {
      const fireTime = i === 0 ? startTime : new Date(startTime.getTime() + intervalMins * i * 60 * 1000);
      const settings: CategorySettings = {
        ...category_settings,
        checkinNumber: i + 1,
        budgetDate,
        parentId: undefined,
      };

      const { data, error } = await supabase
        .from('reminders')
        .insert({
          task_name: n === 1 ? task_name : `${task_name} (${i + 1}/${n})`,
          user_phone: phone,
          scheduled_time: fireTime.toISOString(),
          status: 'pending',
          category,
          category_settings: settings,
          repeat,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      created.push(data);
    }

    // Set parentId on all siblings so they can find each other's completions
    const parentId = created[0].id;
    for (const r of created) {
      await supabase
        .from('reminders')
        .update({ category_settings: { ...r.category_settings, parentId } })
        .eq('id', r.id)
        .eq('user_id', user.id);
    }

    return NextResponse.json(created, { status: 201 });
  }

  // All other categories: single reminder
  const { data, error } = await supabase
    .from('reminders')
    .insert({ task_name, user_phone: phone, scheduled_time, status: 'pending', category, category_settings, repeat, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
