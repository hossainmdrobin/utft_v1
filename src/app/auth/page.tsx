import ReduxProvider from "@/components/providers/ReduxProvider";
import Auth from "@/views/Auth";
import { } from "react-redux";

export default function Page() {
  return (
    <ReduxProvider>
      <Auth />;
    </ReduxProvider>)
}
