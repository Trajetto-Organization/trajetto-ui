import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableLoadingOverlayProps {
  columnCount: number;
  rowCount?: number;
}

function TableLoadingOverlay({
  columnCount,
  rowCount = 8,
}: TableLoadingOverlayProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {Array.from({ length: columnCount }).map((_, index) => (
            <TableHead
              key={`header-skeleton-${index}`}
              className="whitespace-nowrap px-4"
            >
              <Skeleton
                className="h-4 w-full 
                max-w-[120px]"
              />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <TableRow
            key={`row-skeleton-${rowIndex}`}
            className="hover:bg-transparent"
          >
            {Array.from({ length: columnCount }).map((_, colIndex) => (
              <TableCell
                key={`cell-skeleton-${rowIndex}-${colIndex}`}
                className="whitespace-nowrap px-4"
              >
                <Skeleton
                  className="h-4 w-full"
                  style={{
                    maxWidth: `${Math.floor(Math.random() * 40) + 60}%`,
                    animationDelay: `${(rowIndex * columnCount + colIndex) * 0.03}s`,
                  }}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { TableLoadingOverlay };
