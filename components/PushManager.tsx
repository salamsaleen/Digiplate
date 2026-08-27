"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "FILL_ME_IN";

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PushManager() {
    const { data: session } = useSession();
    const [showPrompt, setShowPrompt] = useState(false);
    const [subscribing, setSubscribing] = useState(false);

    useEffect(() => {
        // Check if push is supported
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            return;
        }

        // Check if we need to prompt
        if (Notification.permission === "default") {
            // Wait a few seconds before annoying the user
            const timer = setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
            return () => clearTimeout(timer);
        }

        // If they already granted permission in the past but aren't subscribed in DB, 
        // we could automatically sync it here, but typically the subscription persists.
        // If we want to be robust, we could always silently sync subscription if granted.
        if (Notification.permission === "granted") {
            subscribeUser(true);
        }

    }, [session]);

    const subscribeUser = async (silent = false) => {
        if (!("serviceWorker" in navigator)) return;
        setSubscribing(!silent);

        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Wait for pushmanager to be ready
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                // Not subscribed yet, ask for permission / subscribe
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                });
            }

            // Send subscription to backend
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription)
            });

            if (!silent) {
                setShowPrompt(false);
            }

        } catch (error) {
            console.error("Push subscription failed:", error);
        } finally {
            setSubscribing(false);
        }
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-900 border border-indigo-500 p-4 rounded-xl shadow-2xl z-[100] animate-fade-in-up">
            <div className="flex items-start gap-4">
                <div className="bg-indigo-600/20 p-3 rounded-full text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-bold text-sm mb-1">Enable Notifications</h3>
                    <p className="text-gray-400 text-xs mb-3 leading-relaxed">
                        Get instant alerts when polling opens and when your meals are confirmed.
                    </p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => subscribeUser(false)}
                            disabled={subscribing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors flex-1"
                        >
                            {subscribing ? "Enabling..." : "Enable"}
                        </button>
                        <button 
                            onClick={() => setShowPrompt(false)}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
