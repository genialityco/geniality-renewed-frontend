// hooks/usePaymentSearch.ts
import { useState, useCallback, useEffect, useRef } from "react";
import { PaymentFilters } from "./UtilsPayment";
import { PaymentPlan } from "../../../../services/types";
import { searchPaymentRequests, type PaymentRequestRow } from "../../../../services/paymentRequestsService";
import { fetchPaymentPlanByUserId } from "../../../../services/paymentPlansService";

type UsePaymentSearchReturn = {
    // Filters
    filters: PaymentFilters;
    setQuery: (value: string) => void;
    setStatus: (value: string) => void;
    setDateFrom: (value: Date | null) => void;
    setDateTo: (value: Date | null) => void;

    // Pagination
    page: number;
    setPage: (value: number) => void;

    // Results
    loading: boolean;
    error: string | null;
    rows: PaymentRequestRow[];
    total: number;
    totalPages: number;

    // Actions
    doSearch: () => void;
};

type UsePaymentModalReturn = {
    // Modal state
    rawOpen: boolean;
    sourceRow: PaymentRequestRow | null;

    // Actions
    openRawModal: (row: PaymentRequestRow) => void;
    closeRawModal: () => void;
};

type UsePaymentPlanReturn = {
    // Modal state
    planOpen: boolean;
    loadingPlan: boolean;
    plan: PaymentPlan | null;
    planMsg: string | null;
    sourceRow: PaymentRequestRow | null;

    // Date input
    newUntil: Date | null;
    setNewUntil: (value: Date | null) => void;

    // Actions
    openPlanModal: (row: PaymentRequestRow) => Promise<void>;
    closePlanModal: () => void;
    setPlanMsg: (msg: string | null) => void;
};

export function usePaymentSearch(organizationId: string): UsePaymentSearchReturn {
    const PAGE_SIZE = 20;

    const [filters, setFilters] = useState<PaymentFilters>({
        query: "",
        status: "ALL",
        dateFrom: null,
        dateTo: null,
    });

    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<PaymentRequestRow[]>([]);
    const [total, setTotal] = useState(0);

    const doSearch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await searchPaymentRequests({
                organizationId,
                q: filters.query,
                status: filters.status === "ALL" ? undefined : filters.status,
                page,
                pageSize: PAGE_SIZE,
                dateFrom: filters.dateFrom?.toISOString(),
                dateTo: filters.dateTo?.toISOString(),
            });
            setRows(res.items);
            setTotal(res.total);
            console.log(res);
        } catch (e: any) {
            setError(e?.message || "No se pudo cargar pagos.");
        } finally {
            setLoading(false);
        }
    }, [organizationId, filters, page]);

    useEffect(() => {
        void doSearch();
    }, [doSearch]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const setQuery = useCallback((value: string) => {
        setPage(1);
        setFilters(prev => ({ ...prev, query: value }));
    }, []);

    const setStatus = useCallback((value: string) => {
        setPage(1);
        setFilters(prev => ({ ...prev, status: value }));
    }, []);

    const setDateFrom = useCallback((value: Date | null) => {
        setPage(1);
        setFilters(prev => ({ ...prev, dateFrom: value }));
    }, []);

    const setDateTo = useCallback((value: Date | null) => {
        setPage(1);
        setFilters(prev => ({ ...prev, dateTo: value }));
    }, []);

    return {
        filters,
        setQuery,
        setStatus,
        setDateFrom,
        setDateTo,
        page,
        setPage,
        loading,
        error,
        rows,
        total,
        totalPages,
        doSearch,
    };

}

export function usePaymentPlan(): UsePaymentPlanReturn {
    const [planOpen, setPlanOpen] = useState(false);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [plan, setPlan] = useState<PaymentPlan | null>(null);
    const [newUntil, setNewUntil] = useState<Date | null>(null);
    const [planMsg, setPlanMsg] = useState<string | null>(null);
    const planSourceRow = useRef<PaymentRequestRow | null>(null);

    const openPlanModal = useCallback(async (row: PaymentRequestRow) => {
        setPlanOpen(true);
        setPlan(null);
        setPlanMsg(null);
        setLoadingPlan(true);
        planSourceRow.current = row;

        try {
            const ouId = (row as any)?.organizationUser?.user_id as string;
            if (!ouId) {
                setPlan(null);
            } else {
                const fullPlan = await fetchPaymentPlanByUserId(ouId);
                setPlan(fullPlan);
                setNewUntil(
                    fullPlan?.date_until ? new Date(fullPlan.date_until) : null
                );
            }
        } catch {
            setPlan(null);
        } finally {
            setLoadingPlan(false);
        }
    }, []);

    const closePlanModal = useCallback(() => {
        setPlanOpen(false);
        planSourceRow.current = null;
    }, []);

    return {
        planOpen,
        loadingPlan,
        plan,
        planMsg,
        sourceRow: planSourceRow.current,
        newUntil,
        setNewUntil,
        openPlanModal,
        closePlanModal,
        setPlanMsg,
    };
}

export function usePaymentModal(): UsePaymentModalReturn {
    const [rawOpen, setRawOpen] = useState(false);
    const rawRef = useRef<PaymentRequestRow | null>(null);

    const openRawModal = useCallback((row: PaymentRequestRow) => {
        rawRef.current = row;
        setRawOpen(true);
    }, []);

    const closeRawModal = useCallback(() => {
        setRawOpen(false);
        rawRef.current = null;
    }, []);

    return {
        rawOpen,
        sourceRow: rawRef.current,
        openRawModal,
        closeRawModal,
    };
}
