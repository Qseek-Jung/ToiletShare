import { Capacitor } from '@capacitor/core';
import { PlatformAdapter } from './interface';
import { WebAdapter } from './web';
import { AndroidAdapter } from './android';
import { IOSAdapter } from './ios';

const platform = Capacitor.getPlatform();

let adapter: PlatformAdapter;

switch (platform) {
    case 'android':
        adapter = AndroidAdapter;
        break;
    case 'ios':
        adapter = IOSAdapter;
        break;
    default:
        adapter = WebAdapter;
        break;
}

export const Platform = adapter;

// Log for debugging
console.log(`[Platform] Initialized adapter for: ${platform}`);
