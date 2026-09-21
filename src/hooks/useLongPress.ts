import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

/** 长按判定时长（毫秒） */
const DEFAULT_DELAY = 550;
/** 手指或鼠标移动超过该像素数即视为在滚动页面，取消长按 */
const DEFAULT_MOVE_TOLERANCE = 12;
/** 长按与原生右键菜单两种触发方式的去重时间窗 */
const DUPLICATE_WINDOW = 700;

interface LongPressOptions {
  /** 长按 / 右键时执行的动作 */
  onTrigger: () => void;
  delay?: number;
  moveTolerance?: number;
}

export interface LongPressProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
}

/**
 * 长按（手机 / 触摸屏）与右键（电脑）触发同一个动作。
 *
 * 手机上没有"悬停"这个概念，删除入口用常显的小叉子又很破坏画面，
 * 因此统一用隐藏手势：按住卡片约 0.55 秒，或电脑上点右键。
 *
 * 四个必须处理的细节：
 * 1. Android 长按会同时触发 pointer 计时器和原生 contextmenu 事件，
 *    这里用时间戳去重，避免一次长按弹出两个确认框；
 * 2. 手指移动超过阈值立即取消计时，保证页面滚动完全不受影响；
 * 3. 触发后调用 shouldSuppressClick() 会返回 true 一次，调用方用它吞掉
 *    紧随其后的 click，否则长按抬手会顺手把卡片点开（打开大图灯箱）；
 * 4. onContextMenu 里 preventDefault，阻止浏览器原生菜单 / 移动端
 *    "存储图像"这类弹层盖住我们自己的确认框。
 */
export function useLongPress({
  onTrigger,
  delay = DEFAULT_DELAY,
  moveTolerance = DEFAULT_MOVE_TOLERANCE,
}: LongPressOptions): {
  longPressProps: LongPressProps;
  shouldSuppressClick: () => boolean;
} {
  const timerRef = useRef<number | null>(null);
  const startPointRef = useRef({ x: 0, y: 0 });
  const isTriggeredRef = useRef(false);
  const lastTriggerAtRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const trigger = useCallback(() => {
    clearTimer();
    isTriggeredRef.current = true;
    lastTriggerAtRef.current = Date.now();
    // 震动反馈：Android 有效，iOS 会静默忽略
    navigator.vibrate?.(15);
    onTrigger();
  }, [clearTimer, onTrigger]);

  // 组件卸载时清掉未触发的计时器
  useEffect(() => clearTimer, [clearTimer]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // 右键（button !== 0）交给 onContextMenu 处理，避免鼠标也走计时器
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      startPointRef.current = { x: event.clientX, y: event.clientY };
      isTriggeredRef.current = false;
      clearTimer();
      timerRef.current = window.setTimeout(trigger, delay);
    },
    [clearTimer, delay, trigger]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (timerRef.current === null) return;

      const movedX = event.clientX - startPointRef.current.x;
      const movedY = event.clientY - startPointRef.current.y;
      if (Math.hypot(movedX, movedY) > moveTolerance) clearTimer();
    },
    [clearTimer, moveTolerance]
  );

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      event.preventDefault();
      // 刚被长按触发过（同一手势里 contextmenu 又来了），忽略这次
      if (Date.now() - lastTriggerAtRef.current < DUPLICATE_WINDOW) return;
      trigger();
    },
    [trigger]
  );

  const shouldSuppressClick = useCallback(() => {
    if (!isTriggeredRef.current) return false;
    isTriggeredRef.current = false;
    return true;
  }, []);

  return {
    longPressProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: clearTimer,
      onPointerLeave: clearTimer,
      onPointerCancel: clearTimer,
      onContextMenu: handleContextMenu,
    },
    shouldSuppressClick,
  };
}
