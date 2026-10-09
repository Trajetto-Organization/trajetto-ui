import PageContainer from "../_components/layout/protected-page-container";
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

const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      {/* Header skeleton */}
      <div data-tutorial="loading" className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" /> {/* Title */}
        <Skeleton className="h-4 w-96" /> {/* Description */}
      </div>

      <div className="space-y-6 my-9">
        {/* Alert skeleton - opcional */}
        <Skeleton className="h-16 w-full rounded-md" />

        {/* Tabs skeleton — same composition as the strip it stands in for:
        tabs and refresh stacked full width below `lg`, one row from there. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <Tabs className="w-full lg:w-auto">
            <TabsList className="w-full justify-start lg:w-auto">
              <TabsTrigger
                value="overview"
                className="flex flex-1 items-center gap-2 lg:flex-initial"
              >
                <Skeleton className="h-4 w-4 rounded-full" /> {/* Icon */}
                <Skeleton className="h-4 w-20" /> {/* Tab text */}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Refresh button */}
          <Skeleton className="h-9 w-full lg:ml-auto lg:w-36" />
        </div>

        {/* Stat cards skeleton: the live StatCardGrid's columns and the
            card's fixed band and two-line caption, so nothing jumps. */}
        <div
          className="grid auto-rows-fr grid-cols-1 gap-4
          sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={`stat-${index}`} className="overflow-hidden shadow-md">
              <div className="flex h-full">
                <Skeleton className="w-11 shrink-0 rounded-none" />{" "}
                {/* Icon band */}
                <div className="min-w-0 flex-1 px-3 pb-4 pt-4">
                  <Skeleton className="mb-3 h-5 w-20" /> {/* Title */}
                  <Skeleton className="mb-1 h-8 w-16" /> {/* Value */}
                  <Skeleton className="h-8 w-[85%]" /> {/* Two-line caption */}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Activity Table skeleton */}
        <Card className="shadow-md">
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" /> {/* Title */}
            <Skeleton className="h-4 w-64" /> {/* Description */}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
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
              <div
                className="flex h-full flex-col items-center 
                justify-center p-6 text-center"
              >
                <Skeleton
                  className="h-12 w-12 
                  rounded-full mb-3"
                />{" "}
                {/* Icon */}
                <Skeleton className="h-5 w-32" /> {/* Title */}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

export default Loading;
