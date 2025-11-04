
"use client";

import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white text-center">
      <Image
        src="/next.svg"
        alt="Next.js Logo"
        width={100}
        height={20}
        priority
        className="mb-6"
      />
      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome to EventOps 🚀
      </h1>
      <p className="mt-4 text-gray-600 max-w-md">
        Manage events, tasks, and teams in real-time with MongoDB and Next.js.
      </p>
    </main>
  );
}
