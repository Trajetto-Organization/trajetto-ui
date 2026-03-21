import { useState, useCallback, MutableRefObject } from "react";
import type {
  TooltipPosition,
  ArrowPosition,
  ArrowConfig,
  DemoStep,
} from "../shared/common.types";

const useTooltipPosition = (
  currentStep: number,
  demoSteps: DemoStep[],
  mainRef: MutableRefObject<HTMLDivElement | null>,
  tooltipRef: MutableRefObject<HTMLDivElement | null>,
) => {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
  });
  const [arrowPosition, setArrowPosition] = useState<ArrowPosition>({
    left: "50%",
    top: "",
  });

  const [arrowConfig, setArrowConfig] = useState<ArrowConfig>({
    position: "-bottom-2",
    border: "border-t-[8px] border-t-[#d81b60]",
    transform: "translateX(-50%)",
    transparentBorders:
      "border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent",
    isVertical: true,
  });

  const updateTooltipPosition = useCallback(() => {
    const currentStepData = demoSteps[currentStep];
    if (!currentStepData?.tooltip || !mainRef.current || !tooltipRef.current) {
      return;
    }

    const target = mainRef.current.querySelector(
      currentStepData.tooltip.target,
    ) as HTMLElement;

    if (!target) return;

    // Get consistent positioning using getBoundingClientRect for both elements
    const targetRect = target.getBoundingClientRect();
    const mainRect = mainRef.current.getBoundingClientRect();

    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    // Calculate relative positions within the main container
    const targetRelative = {
      top: targetRect.top - mainRect.top,
      left: targetRect.left - mainRect.left,
      width: targetRect.width,
      height: targetRect.height,
    };

    const margin = 16;
    const arrowOffset = 12;

    let position = currentStepData.tooltip.preferredPosition;

    // Calculate available space using consistent coordinate system
    const spaceAbove = targetRelative.top;
    const spaceBelow =
      mainRef.current.clientHeight -
      (targetRelative.top + targetRelative.height);

    const spaceLeft = targetRelative.left;
    const spaceRight =
      mainRef.current.clientWidth -
      (targetRelative.left + targetRelative.width);

    // Switch position if not enough space
    if (position === "bottom") {
      if (
        spaceBelow < tooltipRect.height + arrowOffset &&
        spaceAbove > tooltipRect.height + arrowOffset
      ) {
        position = "top";
      }
    } else if (position === "top") {
      if (
        spaceAbove < tooltipRect.height + arrowOffset &&
        spaceBelow > tooltipRect.height + arrowOffset
      ) {
        position = "bottom";
      }
    } else if (position === "left") {
      if (
        spaceLeft < tooltipRect.width + arrowOffset &&
        spaceRight > tooltipRect.width + arrowOffset
      ) {
        position = "right";
      }
    } else if (position === "right") {
      if (
        spaceRight < tooltipRect.width + arrowOffset &&
        spaceLeft > tooltipRect.width + arrowOffset
      ) {
        position = "left";
      }
    }

    let top = 0;
    let left = 0;

    let arrowStyle = { left: "50%", top: "" };
    let isVertical = true;

    let transparentBorders =
      "border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent";
    let arrowPos = "-bottom-2";

    let border = "border-t-[8px] border-t-[#d81b60]";
    let transform = "translateX(-50%)";

    if (position === "left" || position === "right") {
      isVertical = false;
      transparentBorders =
        "border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent";

      // Center vertically relative to target
      top =
        targetRelative.top + targetRelative.height / 2 - tooltipRect.height / 2;
      left =
        position === "left"
          ? targetRelative.left - tooltipRect.width - arrowOffset
          : targetRelative.left + targetRelative.width + arrowOffset;

      // Keep arrow centered on target, not tooltip
      let arrowTop = "50%";

      const maxTop = mainRef.current.clientHeight - tooltipRect.height - margin;
      if (top < margin) {
        const targetCenter = targetRelative.top + targetRelative.height / 2;
        arrowTop = `${targetCenter - margin}px`;
        top = margin;
      } else if (top > maxTop) {
        const targetCenter = targetRelative.top + targetRelative.height / 2;
        arrowTop = `${targetCenter - maxTop}px`;
        top = maxTop;
      }

      arrowStyle = { top: arrowTop, left: "" };

      arrowPos = position === "left" ? "-right-2" : "-left-2";
      border =
        position === "left"
          ? "border-l-[8px] border-l-[#d81b60]"
          : "border-r-[8px] border-r-[#d81b60]";
      transform = "translateY(-50%)";
    } else {
      isVertical = true;
      transparentBorders =
        "border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent";

      // Center horizontally relative to target
      left =
        targetRelative.left + targetRelative.width / 2 - tooltipRect.width / 2;

      // Keep arrow centered on target, not tooltip
      let arrowLeft = "50%";

      const maxLeft = mainRef.current.clientWidth - tooltipRect.width - margin;
      if (left < margin) {
        const targetCenter = targetRelative.left + targetRelative.width / 2;
        arrowLeft = `${targetCenter - margin}px`;
        left = margin;
      } else if (left > maxLeft) {
        const targetCenter = targetRelative.left + targetRelative.width / 2;
        arrowLeft = `${targetCenter - maxLeft}px`;
        left = maxLeft;
      }

      arrowStyle = { left: arrowLeft, top: "" };

      top =
        position === "bottom"
          ? targetRelative.top + targetRelative.height + arrowOffset
          : targetRelative.top - tooltipRect.height - arrowOffset;

      arrowPos = position === "bottom" ? "-top-2" : "-bottom-2";
      border =
        position === "bottom"
          ? "border-b-[8px] border-b-[#d81b60]"
          : "border-t-[8px] border-t-[#d81b60]";
      transform = "translateX(-50%)";
    }

    setTooltipPosition({ top, left });
    setArrowPosition(arrowStyle);

    setArrowConfig({
      position: arrowPos,
      border,
      transform,
      transparentBorders,
      isVertical,
    });
  }, [currentStep, demoSteps, mainRef, tooltipRef]);

  return {
    tooltipPosition,
    arrowPosition,
    arrowConfig,
    updateTooltipPosition,
  };
};

export { useTooltipPosition };
