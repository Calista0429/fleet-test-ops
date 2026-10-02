import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
class TestResizeObserver {observe(){} unobserve(){} disconnect(){}}
beforeEach(()=>vi.stubGlobal('ResizeObserver',TestResizeObserver));
