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
                    /*
                      Derived from the cell's position rather than drawn at
                      random. The ragged widths are what make a skeleton read
                      as text instead of as bars, so the variety matters — but
                      `Math.random()` in a render gives the server one number
                      and the client another, and React calls that a hydration
                      mismatch and throws the server's markup away. The
                      sequence below is just as uneven and is the same on both
                      sides.
                    */
                    maxWidth: `${60 + ((rowIndex * 7 + colIndex * 13) % 40)}%`,
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
