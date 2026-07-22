import { ReactNode } from "react";

export default function ECRLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ecr-layout min-h-screen w-full flex flex-col bg-slate-50">
      <div className="flex-1">
        {children}
      </div>
    </div>);
}
