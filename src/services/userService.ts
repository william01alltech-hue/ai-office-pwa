import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export type UserRole = 'admin' | 'enterprise' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  points: number;
  inviteCode?: string;
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
    const existingProfile = userSnap.data() as UserProfile;
    await setDoc(userRef, {
      ...existingProfile,
      lastLoginAt: serverTimestamp(),
      displayName: user.displayName || existingProfile.displayName,
      photoURL: user.photoURL || existingProfile.photoURL,
    }, { merge: true });
    return { ...existingProfile, uid: user.uid };
  } else {
    const isAdmin = ADMIN_EMAILS.includes(user.email || '');
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '用戶',
      photoURL: user.photoURL || '',
      role: isAdmin ? 'admin' : 'user',
      points: isAdmin ? 99999 : 100,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  }
};

// 邀請碼兌換 - 成功回傳新 role，失敗拋出錯誤訊息
export const redeemInviteCode = async (uid: string, code: string): Promise<UserRole> => {
  const codeRef = doc(db, 'inviteCodes', code.toUpperCase().trim());
  const userRef = doc(db, 'users', uid);

  return await runTransaction(db, async (transaction) => {
    const codeSnap = await transaction.get(codeRef);
    const userSnap = await transaction.get(userRef);

    if (!codeSnap.exists()) {
      throw new Error('邀請碼不存在，請確認後重新輸入。');
    }

    const codeData = codeSnap.data();

    if (codeData.isUsed && !codeData.multiUse) {
      throw new Error('此邀請碼已被使用過了。');
    }

    if (!userSnap.exists()) {
      throw new Error('用戶資料不存在。');
    }

    const userProfile = userSnap.data() as UserProfile;
    if (userProfile.role === 'enterprise' || userProfile.role === 'admin') {
      throw new Error('您的帳號已經是企業或管理員等級，不需要再兌換邀請碼。');
    }

    // 更新邀請碼狀態
    transaction.update(codeRef, {
      isUsed: true,
      usedBy: uid,
      usedAt: serverTimestamp(),
    });

    // 升級用戶等級
    transaction.update(userRef, {
      role: 'enterprise',
      points: 99999,
      inviteCode: code.toUpperCase().trim(),
    });

    return 'enterprise' as UserRole;
  });
};

// 扣除一點算力 - 管理員與企業版跳過
export const deductPoint = async (uid: string, role: UserRole): Promise<number> => {
  if (role === 'admin' || role === 'enterprise') return 99999;
  
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('用戶不存在');
  
  const profile = userSnap.data() as UserProfile;
  if (profile.points <= 0) throw new Error('INSUFFICIENT_POINTS');
  
  const newPoints = profile.points - 1;
  await setDoc(userRef, { points: newPoints }, { merge: true });
  return newPoints;
};
