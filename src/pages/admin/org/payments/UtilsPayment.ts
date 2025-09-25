import { SetStateAction } from "react";

export type ExtractedMethod = {
    method?: string; // CARD | PSE | NEQUI | ...
    brand?: string; // VISA, MASTERCARD...
    last4?: string;
    bank?: string; // nombre o código de banco (PSE)
};

export type ExtractedPayer = {
    name?: string;
    email?: string;
    phone?: string;
    legalId?: string;
    legalIdType?: string;
};

export type TxSummary = {
    id?: string;
    status?: string;
    statusMessage?: string;
    amountInCents?: number;
    currency?: string;
    reference?: string;
    createdAt?: string | Date;
    finalizedAt?: string | Date;
    paymentMethod?: ExtractedMethod & {
        rawType?: string;
        installments?: number | string;
    };
    payer?: ExtractedPayer;
    redirectUrl?: string;
    bankExtra?: Record<string, any>;
};

export type PaymentFilters = {
    query: string;
    status: string;
    dateFrom: Date | null;
    dateTo: Date | null;
};

export type PaymentFiltersActions = {
    setQuery: (value: string) => void;
    setStatus: (value: string) => void;
    setDateFrom: (value: SetStateAction<Date | null>) => void;
    setDateTo: (value: SetStateAction<Date | null>) => void;
};

export const STATUS_OPTIONS = [
    { value: "ALL", label: "Todos" },
    { value: "CREATED", label: "CREATED" },
    { value: "PENDING", label: "PENDING" },
    { value: "APPROVED", label: "APPROVED" },
    { value: "DECLINED", label: "DECLINED" },
    { value: "VOIDED", label: "VOIDED" },
    { value: "ERROR", label: "ERROR" },
];

export function getBadgeColor(status: string) {
    if (status === "APPROVED") return "green";
    if (status === "PENDING" || status === "CREATED") return "yellow";
    if (status === "DECLINED" || status === "VOIDED" || status === "ERROR") return "red";
    return "gray";
}

export function formatCOP(n: number) {
    return n.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

export function getLast<T>(arr?: T[]): T | undefined {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    return arr[arr.length - 1];
}

export function getTxFromSnapshotPayload(payload: any) {
    if (!payload) return undefined;

    const d = payload.data;
    // 1) payload.data directo
    if (d?.id && (d?.status || d?.payment_method || d?.amount_in_cents)) {
        return d;
    }
    // 2) payload.data.transaction
    if (d?.transaction) return d.transaction;
    // 3) payload.transaction raíz
    if (payload.transaction) return payload.transaction;
    // 4) payload = tx
    if (payload?.id && (payload?.status || payload?.payment_method))
        return payload;

    return undefined;
}

export function extractPaymentMethodFromRow(row: any): ExtractedMethod {
    // Directo si ya lo incluyes en la row
    const direct: ExtractedMethod | undefined = row?.paymentMethod || row?.method;
    if (direct?.method) return direct;

    const lastSnap = getLast(row?.wompi_snapshots);
    const tx =
        lastSnap && typeof lastSnap === "object" && "payload" in lastSnap
            ? getTxFromSnapshotPayload((lastSnap as any).payload)
            : undefined;
    const pm = tx?.payment_method || tx?.paymentMethod;
    if (!pm) return {};

    const type = String(pm?.type || tx?.payment_method_type || "").toUpperCase();

    if (type === "CARD") {
        return {
            method: "CARD",
            brand:
                pm?.extra?.brand || pm?.extra?.brand_name || pm?.brand || pm?.network,
            last4: pm?.extra?.last_four || pm?.extra?.last4 || pm?.last4,
        };
    }
    if (type === "PSE") {
        // Wompi a veces no trae 'bank', pero sí 'financial_institution_code'
        const bank =
            pm?.extra?.bank ||
            pm?.bank ||
            pm?.extra?.bank_name ||
            pm?.financial_institution ||
            pm?.financial_institution_name ||
            pm?.financial_institution_code;
        return { method: "PSE", bank };
    }

    return { method: type || undefined };
}

export function extractStatusMessageFromRow(row: any): string | undefined {
    const direct =
        row?.statusMessage ||
        row?.status_message ||
        row?.gatewayMessage ||
        row?.message;
    if (direct) return String(direct);

    const lastSnap = getLast(row?.wompi_snapshots);
    const tx =
        lastSnap && typeof lastSnap === "object" && "payload" in lastSnap
            ? getTxFromSnapshotPayload((lastSnap as any).payload)
            : undefined;

    const msg =
        tx?.status_message ||
        tx?.statusMessage ||
        tx?.reason ||
        tx?.response?.message ||
        tx?.message;

    return msg ? String(msg) : undefined;
}

// ✅ Usa también rawWebhook y prioriza customer_data del snapshot o del raw
export function extractPayerFromRow(row: any): ExtractedPayer {
    // 1) OrganizationUser (fallback institucional)
    const props = row?.organizationUser?.properties || {};
    const nameOU =
        props.names ||
        [props.nombres, props.apellidos].filter(Boolean).join(" ") ||
        props.name;
    const emailOU = props.email;

    // 2) Último snapshot (el que usas en UI)
    const lastSnap = getLast(row?.wompi_snapshots);
    const tx =
        lastSnap && typeof lastSnap === "object" && "payload" in lastSnap
            ? getTxFromSnapshotPayload((lastSnap as any).payload)
            : undefined;

    const pm = tx?.payment_method || tx?.paymentMethod;
    const cdTx = tx?.customer_data || tx?.customerData || {};
    const billing = tx?.billing_data || tx?.billingData || {};

    // 3) rawWebhook (cuando no hay snapshot/tx o está más “fresco”)
    const rawTx =
        row?.rawWebhook?.data?.transaction ??
        row?.rawWebhook?.transaction ??
        undefined;
    const cdRaw = rawTx?.customer_data || {};

    // 4) Componer nombre si viene en partes
    const composedTx =
        [cdTx.first_name, cdTx.middle_name, cdTx.last_name]
            .filter(Boolean)
            .join(" ") || undefined;

    const composedRaw =
        [cdRaw.first_name, cdRaw.middle_name, cdRaw.last_name]
            .filter(Boolean)
            .join(" ") || undefined;

    // 5) Candidatos de nombre (prioridad: snapshot → raw → OU)
    const nameFromTx =
        cdTx.full_name ||
        cdTx.fullName ||
        cdTx.name ||
        cdTx.nombres ||
        composedTx;

    const nameFromRaw =
        cdRaw.full_name ||
        cdRaw.fullName ||
        cdRaw.name ||
        cdRaw.nombres ||
        composedRaw;

    const name =
        nameFromTx ??
        nameFromRaw ??
        nameOU ??
        undefined;

    // 6) Email (prioridad: tx → raw → OU)
    const emailFromTx = tx?.customer_email || cdTx?.email;
    const emailFromRaw = rawTx?.customer_email || cdRaw?.email;
    const email = emailFromTx ?? emailFromRaw ?? emailOU ?? undefined;

    // 7) Teléfono (prioridad: tx → raw)
    const phone = cdTx?.phone_number ?? cdRaw?.phone_number ?? undefined;

    // 8) Documento (billing primero, luego payment_method)
    const legalId = billing?.legal_id ?? pm?.user_legal_id ?? undefined;
    const legalIdType = billing?.legal_id_type ?? pm?.user_legal_id_type ?? undefined;

    return { name, email, phone, legalId, legalIdType };
}
export function buildTxSummaryFromSnapshot(snap?: any): TxSummary | undefined {
    if (!snap) return undefined;
    const tx = getTxFromSnapshotPayload(snap.payload);
    if (!tx) return undefined;

    const pm = tx?.payment_method || tx?.paymentMethod;
    const methodExtract = extractPaymentMethodFromRow({
        wompi_snapshots: [snap],
    });

    const cd = tx?.customer_data || tx?.customerData || {};
    const billing = tx?.billing_data || tx?.billingData || {};
    const payer = {
        name: cd?.full_name || cd?.name || cd?.nombres,
        email: tx?.customer_email || cd?.email,
        phone: cd?.phone_number,
        legalId: billing?.legal_id || pm?.user_legal_id,
        legalIdType: billing?.legal_id_type || pm?.user_legal_id_type,
    };
    console.log("Payer Name:", payer.name);

    const bankExtra =
        methodExtract.method === "PSE"
            ? {
                ticket_id: pm?.extra?.ticket_id,
                traceability_code: pm?.extra?.traceability_code,
                bank_processing_date: pm?.extra?.bank_processing_date,
                return_code: pm?.extra?.return_code,
                financial_institution_code:
                    pm?.financial_institution_code ||
                    pm?.extra?.financial_institution_code,
                async_payment_url: pm?.extra?.async_payment_url,
            }
            : undefined;

    return {
        id: tx?.id,
        status: tx?.status,
        statusMessage:
            tx?.status_message ||
            tx?.statusMessage ||
            tx?.reason ||
            tx?.response?.message ||
            tx?.message,
        amountInCents: tx?.amount_in_cents,
        currency: tx?.currency,
        reference: tx?.reference,
        createdAt: tx?.created_at,
        finalizedAt: tx?.finalized_at,
        paymentMethod: {
            ...methodExtract,
            rawType: pm?.type || tx?.payment_method_type,
            installments: pm?.installments,
        },
        payer,
        redirectUrl: tx?.redirect_url,
        bankExtra,
    };
}