import { ReactNode } from "react";
import PortalLayout from "../components/BusinessPortal/PortalLayout";

export default function AddEventLayout({ children }: { children: ReactNode }) {
  return <PortalLayout>{children}</PortalLayout>;
}
