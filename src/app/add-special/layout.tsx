import { ReactNode } from "react";
import PortalLayout from "../components/BusinessPortal/PortalLayout";

export default function AddSpecialLayout({ children }: { children: ReactNode }) {
  return <PortalLayout>{children}</PortalLayout>;
}
