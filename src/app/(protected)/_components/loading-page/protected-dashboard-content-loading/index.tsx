import { Skeleton } from "@/components/ui/skeleton";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ProtectedDashboardContentLoading = (): JSX.Element => {
  return (
    <div data-tutorial="loading" className="space-y-6 my-9">
      {/* Alert skeleton */}
      <Skeleton className="h-16 w-full rounded-md" />

      {/* Tabs skeleton — tabs and refresh stacked full width below `lg`,
      one row from there, like the strip it stands in for. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <Tabs className="w-full lg:w-auto">
          <TabsList className="w-full justify-start lg:w-auto">
            <TabsTrigger
              value="overview"
              className="flex flex-1 items-center gap-2 lg:flex-initial"
            >
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Skeleton className="h-9 w-full lg:ml-auto lg:w-36" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={`stat-${index}`} className="overflow-hidden shadow-md">
            <div className="flex">
              <Skeleton className="w-1/4 h-[90px]" />
              <div className="w-3/4 py-4 px-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-[80%]" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activity Table skeleton */}
      <Card className="shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {/* ID, the compact record id (IdCell, 112px). */}
                <TableHead>
                  <Skeleton className="h-4 w-8" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead className="w-[40%]">
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-28" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-28" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`row-${index}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick access links skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={`link-${index}`} className="shadow-md">
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <Skeleton className="h-12 w-12 rounded-full mb-3" />
              <Skeleton className="h-5 w-32" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export { ProtectedDashboardContentLoading };
