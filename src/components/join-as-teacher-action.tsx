"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { findTeacherByUserId, loadAppState } from "@/lib/mock-db";

type JoinAsTeacherActionProps = {
  className?: string;
  children: React.ReactNode;
};

export function JoinAsTeacherAction({ className, children }: JoinAsTeacherActionProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  function handleJoinAsTeacher() {
    const snapshot = loadAppState();
    const session = snapshot.session;

    if (!session) {
      router.push("/auth?role=teacher");
      return;
    }

    if (session.role === "parent") {
      pushToast({
        tone: "warning",
        title: "You're registered as a parent. Create a new account to join as a teacher.",
      });
      return;
    }

    const existingTeacher = findTeacherByUserId(session.id);
    if (existingTeacher) {
      router.push("/teacher/dashboard");
      return;
    }

    router.push("/teacher/setup");
  }

  return (
    <button type="button" className={className} onClick={handleJoinAsTeacher}>
      {children}
    </button>
  );
}
