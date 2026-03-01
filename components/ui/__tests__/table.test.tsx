// @ts-nocheck
import React from "react";
import { render, screen } from "@testing-library/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";

describe("Table", () => {
  it("renders a table element", () => {
    render(<Table><tbody></tbody></Table>);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Table className="custom-class"><tbody></tbody></Table>);
    const table = screen.getByRole("table");
    expect(table).toHaveClass("custom-class");
  });

  it("wraps table in overflow container", () => {
    const { container } = render(<Table><tbody></tbody></Table>);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("overflow-auto");
  });
});

describe("TableHeader", () => {
  it("renders a thead element", () => {
    const { container } = render(
      <table>
        <TableHeader><tr><th>Header</th></tr></TableHeader>
      </table>
    );
    expect(container.querySelector("thead")).toBeInTheDocument();
  });
});

describe("TableBody", () => {
  it("renders a tbody element", () => {
    const { container } = render(
      <table>
        <TableBody><tr><td>Cell</td></tr></TableBody>
      </table>
    );
    expect(container.querySelector("tbody")).toBeInTheDocument();
  });
});

describe("TableFooter", () => {
  it("renders a tfoot element", () => {
    const { container } = render(
      <table>
        <TableFooter><tr><td>Footer</td></tr></TableFooter>
      </table>
    );
    expect(container.querySelector("tfoot")).toBeInTheDocument();
  });
});

describe("TableRow", () => {
  it("renders a tr element", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRow><td>Row</td></TableRow>
        </tbody>
      </table>
    );
    expect(container.querySelector("tr")).toBeInTheDocument();
  });

  it("applies hover styles class", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRow><td>Row</td></TableRow>
        </tbody>
      </table>
    );
    expect(container.querySelector("tr")).toHaveClass("hover:bg-muted/50");
  });
});

describe("TableHead", () => {
  it("renders a th element", () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <TableHead>Column</TableHead>
          </tr>
        </thead>
      </table>
    );
    expect(container.querySelector("th")).toBeInTheDocument();
  });

  it("displays children content", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead>Column Name</TableHead>
          </tr>
        </thead>
      </table>
    );
    expect(screen.getByText("Column Name")).toBeInTheDocument();
  });
});

describe("TableCell", () => {
  it("renders a td element", () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <TableCell>Cell data</TableCell>
          </tr>
        </tbody>
      </table>
    );
    expect(container.querySelector("td")).toBeInTheDocument();
  });

  it("displays children content", () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell>Cell content</TableCell>
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByText("Cell content")).toBeInTheDocument();
  });
});

describe("TableCaption", () => {
  it("renders a caption element", () => {
    const { container } = render(
      <table>
        <TableCaption>Table description</TableCaption>
        <tbody></tbody>
      </table>
    );
    expect(container.querySelector("caption")).toBeInTheDocument();
  });

  it("displays caption text", () => {
    render(
      <table>
        <TableCaption>A list of recent invoices.</TableCaption>
        <tbody></tbody>
      </table>
    );
    expect(screen.getByText("A list of recent invoices.")).toBeInTheDocument();
  });
});

describe("Table integration", () => {
  it("renders a complete table structure", () => {
    render(
      <Table>
        <TableCaption>Data Table</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Item 1</TableCell>
            <TableCell>100</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Item 2</TableCell>
            <TableCell>200</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>300</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Data Table")).toBeInTheDocument();
  });
});
