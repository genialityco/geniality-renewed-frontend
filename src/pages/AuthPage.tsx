import AuthForm from "../components/AuthForm";
import { useSearchParams } from "react-router-dom";

export default function AuthPage({
  isPaymentPage,
}: {
  isPaymentPage?: boolean;
}) {
  const [searchParams] = useSearchParams();
  const paymentParam = searchParams.get("payment") === "1";
  const effectiveIsPaymentPage = isPaymentPage || paymentParam;

  return <AuthForm isPaymentPage={effectiveIsPaymentPage} />;
}
