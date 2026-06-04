import { CardSkeleton, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}
