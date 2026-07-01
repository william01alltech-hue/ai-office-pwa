import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  points: number;
  createdAt: any;
  lastLoginAt: any;
}

// 管理員名單 - 這裡的帳號登入後自動取得管理員權限
const ADMIN_EMAILS = [
  'william01.alltech@gmail.com',
];

export const getOrCreateUserProfile = async (user: User): Promise<UserProfile> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // 用戶已存在，更新最後登入時間
    const existingProfile = userSnap.data() as UserProfile;
    await setDoc(userRef, {
      ...existingProfile,
      lastLoginAt: serverTimestamp(),
      displayName: user.displayName || existingProfile.displayName,
      photoURL: user.photoURL || existingProfile.photoURL,
    }, { merge: true });
    return { ...existingProfile, uid: user.uid };
  } else {
    // 新用戶，建立資料
    const isAdmin = ADMIN_EMAILS.includes(user.email || '');
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '用戶',
      photoURL: user.photoURL || '',
      role: isAdmin ? 'admin' : 'user',
      points: isAdmin ? 99999 : 100, // 管理員無限點數，新用戶送 100 點
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  }
};
