import { PhoneMicDesktopAPI } from '@phonemic/shared';

declare global {
  interface Window {
    phoneMicDesktop: PhoneMicDesktopAPI;
  }
}
