"use client";

import { useRef, ElementType, ComponentType, ReactNode, Ref } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

export default function ScrubTextAnimation({
  text,
  highlightWords = [],
  className = "",
  as: Tag = "div",
}: {
  text: string;
  highlightWords?: string[];
  className?: string;
  as?: ElementType;
}) {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;
    
    const words = containerRef.current.querySelectorAll(".scrub-word");
    
    gsap.fromTo(words, 
      { opacity: 0.2 },
      {
        opacity: 1,
        stagger: 0.1,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
          end: "bottom 60%",
          scrub: true,
        }
      }
    );
  }, { scope: containerRef, dependencies: [text] });

  // Split text by spaces
  const words = (text || "").split(" ");
  const Component = Tag as ComponentType<{ className?: string; children?: ReactNode; ref?: Ref<HTMLElement> }>;

  return (
    <Component ref={containerRef} className={className || "inline-block"}>
      {words.map((word, i) => {
        // Strip punctuation for matching
        const cleanWord = word.replace(/[^\w]/g, "").toLowerCase();
        const isHighlighted = highlightWords.some(hw => hw.toLowerCase() === cleanWord);
        
        return (
          <span key={i} className="inline-block mr-[0.25em]">
            <span 
              className={`scrub-word transition-colors duration-300 ${isHighlighted ? "text-emerald-500" : ""}`}
            >
              {word}
            </span>
          </span>
        );
      })}
    </Component>
  );
}
