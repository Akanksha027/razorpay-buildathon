import { NextRequest, NextResponse } from "next/server";

const STUB_ENDPOINT =
  process.env.ESCALATION_WEBHOOK_URL ||
  "https://hooks.slack.com/services/DEMO/PROFIT/PILOT";

const recent: Array<{
  id: string;
  receivedAt: string;
  payload: unknown;
  endpoint: string;
}> = [];

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const id = "wh_" + Math.random().toString(36).slice(2, 9);
    const entry = {
      id,
      receivedAt: new Date().toISOString(),
      payload,
      endpoint: STUB_ENDPOINT,
    };
    recent.unshift(entry);
    if (recent.length > 40) recent.pop();

    console.log("[escalation-webhook-stub]", JSON.stringify(entry, null, 2));

    return NextResponse.json({
      success: true,
      stubbed: true,
      id,
      endpoint: STUB_ENDPOINT,
      message: "Merchant notification stubbed — payload captured for demo.",
      deliveredAt: entry.receivedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Webhook failed" },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    endpoint: STUB_ENDPOINT,
    count: recent.length,
    recent,
  });
}
