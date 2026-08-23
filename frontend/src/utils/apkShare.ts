export const APK_PATH = '/downloads/jenix-community.apk';

export function getApkUrl(): string {
  return `${window.location.origin}${APK_PATH}`;
}
