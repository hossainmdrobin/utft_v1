import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type InstallmentParam = { month: number; year: number; day?: number };

function getBaseUrl(request: NextRequest) {
    return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
    const user = await getCurrentMember(request);
    if (!user) {
        return NextResponse.json({ error: "You must be logged in to make a payment." }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const description = String(body.description || "Membership payment").trim();
    const installments: InstallmentParam[] = Array.isArray(body.installments)
        ? body.installments
            .filter((installment): installment is InstallmentParam =>
                Number.isInteger(installment?.month) && Number.isInteger(installment?.year),
            )
            .map(({ month, year, day }) => ({ month, year, day: Number.isInteger(day) ? day : undefined }))
        : [];
    const status = String(body.status || "");

    if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "A valid amount and all customer details are required." }, { status: 400 });
    }

    const storeId = process.env.AAMARPAY_STORE_ID;
    const signatureKey = process.env.AAMARPAY_SIGNATURE_KEY;
    if (!storeId || !signatureKey) {
        return NextResponse.json({ error: "AamarPay is not configured on the server." }, { status: 503 });
    }

    const baseUrl = getBaseUrl(request);
    const transactionId = `UTFT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const successUrl = new URL("/api/aamarpay/callback", baseUrl);
    successUrl.searchParams.set("status", "success");
    successUrl.searchParams.set("installmentStatus", status);
    successUrl.searchParams.set("transactionId", transactionId);
    successUrl.searchParams.set("amount", amount.toFixed(2));
    successUrl.searchParams.set("description", description);
    successUrl.searchParams.set("user_id", String(user._id));
    successUrl.searchParams.set("installments", JSON.stringify(installments));
    const endpoint = process.env.AAMARPAY_SANDBOX === "true"
        ? "https://sandbox.aamarpay.com/jsonpost.php"
        : "https://secure.aamarpay.com/jsonpost.php";

    const gatewayResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
            store_id: storeId,
            signature_key: signatureKey,
            tran_id: transactionId,
            amount: amount.toFixed(2),
            currency: "BDT",
            desc: description,
            cus_name: 'name',
            cus_email: 'email@gmail.com',
            cus_phone: '012343544',
            cus_add1: "Dhaka",
            cus_city: "Dhaka",
            cus_country: "Bangladesh",
            success_url: successUrl.toString(),
            fail_url: `${baseUrl}/api/aamarpay/callback?status=fail`,
            cancel_url: `${baseUrl}/api/aamarpay/callback?status=cancel`,
            type: "json",
        }),
    });

    const result = await gatewayResponse.json().catch(() => null);
    if (!gatewayResponse.ok || !result?.payment_url) {
        return NextResponse.json({ error: result?.error || "AamarPay did not return a payment URL." }, { status: 502 });
    }

    return NextResponse.json({ paymentUrl: result.payment_url, transactionId });
}
