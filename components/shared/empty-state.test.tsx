import { fireEvent, render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/shared/empty-state";

describe("EmptyState", () => {
  it("renders the title, description, and action label", () => {
    render(
      <EmptyState
        title="No orders match your filters"
        description="Try adjusting or clearing your search, status, or date filters."
        actionLabel="Clear filters"
        onAction={() => {}}
      />
    );

    expect(screen.getByText("No orders match your filters")).toBeInTheDocument();
    expect(screen.getByText(/Try adjusting or clearing/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("calls onAction when the action button is clicked", () => {
    const onAction = jest.fn();
    render(<EmptyState title="Nothing here" actionLabel="Clear filters" onAction={onAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders no button at all when no action is given", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
