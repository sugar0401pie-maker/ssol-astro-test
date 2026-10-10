"use client";

// 인터넷이 끊기면 화면 위에 안내(해석 DB B14 ERR_NETWORK). 다시 연결되면 사라진다 — 입력한 값은 화면에 그대로 남아 있다.
import { useEffect, useState } from "react";
import { b14, useCopy } from "@/lib/copy/useCopy";

export default function NetworkNotice() {
  const copy = useCopy();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="alert" className="net-notice">
      <b>{b14(copy, "ERR_NETWORK", "title", "별과의 연결이 잠시 끊겼어요")}</b>
      <span>{b14(copy, "ERR_NETWORK", "body", "인터넷 연결을 확인해 주세요. 연결되면 하던 곳부터 이어서 보여 드릴게요.")}</span>
    </div>
  );
}
