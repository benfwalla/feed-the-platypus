"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useRef, useEffect, useCallback } from "react";

// Generate a unique visitor ID and persist it
function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("platypus-visitor-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("platypus-visitor-id", id);
  }
  return id;
}

export default function Home() {
  const [visitorId, setVisitorId] = useState<string>("");
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isEating, setIsEating] = useState(false);
  const [showBall, setShowBall] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const platypusRef = useRef<HTMLDivElement>(null);

  // Initialize visitor ID on client
  useEffect(() => {
    setVisitorId(getVisitorId());
  }, []);

  // Convex queries and mutations
  const globalCount = useQuery(api.feeding.getGlobalCount);
  const myCount = useQuery(
    api.feeding.getVisitorCount,
    visitorId ? { visitorId } : "skip"
  );
  const feedPlatypus = useMutation(api.feeding.feedPlatypus);

  const resetBall = useCallback(() => {
    // Generate random position within viewport bounds
    const x = Math.random() * (window.innerWidth - 50); // 50px is ball width
    const y = Math.random() * (window.innerHeight - 150); // Leave space for platypus and footer
    setBallPosition({ x, y });
    setShowBall(true);
  }, []);

  const handleFeed = useCallback(async () => {
    if (!visitorId) return;
    
    setShowBall(false);
    setIsEating(true);
    setIsHovering(false); // Clear hover state when feeding
    
    await feedPlatypus({ visitorId });
    
    // Animation delay before showing new ball
    setTimeout(() => {
      setIsEating(false);
      resetBall();
    }, 600);
  }, [visitorId, feedPlatypus, resetBall]);

  const checkCollision = useCallback(() => {
    if (!platypusRef.current) return false;
    const platypusRect = platypusRef.current.getBoundingClientRect();
    
    // Get actual ball position from DOM element
    const ballElement = document.querySelector('[data-ball="true"]');
    if (!ballElement) return false;
    const ballRect = ballElement.getBoundingClientRect();
    const ballCenterX = ballRect.left + ballRect.width / 2;
    const ballCenterY = ballRect.top + ballRect.height / 2;
    
    // Check if ball center is within the entire platypus area
    console.log('Collision check:', {
      ballCenter: { x: ballCenterX, y: ballCenterY },
      platypusBounds: {
        left: platypusRect.left,
        right: platypusRect.right,
        top: platypusRect.top,
        bottom: platypusRect.bottom,
      },
      isColliding: ballCenterX >= platypusRect.left && ballCenterX <= platypusRect.right && ballCenterY >= platypusRect.top && ballCenterY <= platypusRect.bottom
    });
    
    return (
      ballCenterX >= platypusRect.left &&
      ballCenterX <= platypusRect.right &&
      ballCenterY >= platypusRect.top &&
      ballCenterY <= platypusRect.bottom
    );
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!showBall) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - ballPosition.x,
      y: e.clientY - ballPosition.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setBallPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
      
      // Check if hovering over platypus during drag
      if (checkCollision()) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    },
    [isDragging, checkCollision]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (checkCollision()) {
      handleFeed();
    }
  }, [isDragging, checkCollision, handleFeed]);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!showBall) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragOffset.current = {
      x: touch.clientX - ballPosition.x,
      y: touch.clientY - ballPosition.y,
    };
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      setBallPosition({
        x: touch.clientX - dragOffset.current.x,
        y: touch.clientY - dragOffset.current.y,
      });
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (checkCollision()) {
      handleFeed();
    }
  }, [isDragging, checkCollision, handleFeed]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className="relative min-h-screen bg-white overflow-hidden select-none">
      {/* Title */}
      <h1 className="text-center text-4xl font-bold text-gray-800 pt-8">
        feed the platypus
      </h1>

      {/* Draggable Ball */}
      {showBall && (
        <div
          data-ball="true"
          className={`absolute w-12 h-12 rounded-full bg-red-500 shadow-lg cursor-grab active:cursor-grabbing transition-transform ${
            isDragging ? "scale-110" : ""
          }`}
          style={{
            left: ballPosition.x,
            top: ballPosition.y,
            touchAction: "none",
            zIndex: isDragging ? 50 : 10,
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
      )}

      {/* Platypus - Bottom Center */}
      <div
        ref={platypusRef}
        className={`absolute left-1/2 bottom-32 -translate-x-1/2 transition-transform duration-200 ${
          isEating || isHovering ? "scale-110" : ""
        }`}
      >
        {/* Platypus Body */}
        <div className="relative">
          {/* Tail */}
          <div className="absolute -left-16 top-12 w-20 h-8 bg-amber-800 rounded-full transform -rotate-12" />
          
          {/* Body */}
          <div className="w-40 h-24 bg-gradient-to-b from-amber-600 to-amber-700 rounded-[60px] relative">
            {/* Belly */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 bg-amber-400 rounded-[40px]" />
          </div>
          
          {/* Head */}
          <div className="absolute -right-8 top-2 w-20 h-16 bg-gradient-to-b from-amber-600 to-amber-700 rounded-full">
            {/* Eye */}
            <div className="absolute top-3 left-4 w-4 h-4 bg-white rounded-full">
              <div className="absolute top-1 left-1 w-2 h-2 bg-black rounded-full" />
            </div>
          </div>
          
          {/* Bill/Beak */}
          <div 
            className={`absolute -right-20 top-6 w-16 h-8 bg-gradient-to-r from-amber-800 to-amber-900 rounded-full transition-all duration-200 ${
              isEating ? "h-10 top-5" : ""
            }`}
          />
          
          {/* Feet */}
          <div className="absolute -bottom-4 left-8 w-8 h-4 bg-amber-800 rounded-full" />
          <div className="absolute -bottom-4 right-8 w-8 h-4 bg-amber-800 rounded-full" />
        </div>
      </div>

      {/* Stats Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
        <p className="text-gray-800">
          You've fed the platypus {myCount ?? 0} times
        </p>
        <p className="text-gray-800">
          The world has fed the platypus {globalCount ?? 0} times
        </p>
      </div>
    </div>
  );
}
