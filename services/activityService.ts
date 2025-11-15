import { collection, deleteDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";


export interface Category {
  id: string;
  categoryName: string;
  accessLevel: string;
  createdBy: string;
  description?: string;
}

export interface Mood {
  id: string;
  moodName: string;
  accessLevel: string;
  createdBy: string;
  description?: string;
}

export interface Activity {
  id: string;
  description?: string;
  activityTitle: string;
  createdBy: string;
  moodIds: string[];
  categoryId: string;
  emoji?: string;
}

// Fetch categories from Firestore
export async function fetchCategories(): Promise<Category[]> {
  const querySnapshot = await getDocs(collection(db, "Category"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    categoryName: doc.data().categoryName,
    accessLevel: doc.data().accessLevel,
    createdBy: doc.data().createdBy,
    description: doc.data().description,
  }));
}

// Fetch moods from Firestore
export async function fetchMoods(): Promise<Mood[]> {
  const querySnapshot = await getDocs(collection(db, "Mood"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    moodName: doc.data().moodName,
    accessLevel: doc.data().accessLevel,
    createdBy: doc.data().createdBy,
    description: doc.data().description,
  }));
}

// Fetch activities from Firestore
export async function fetchActivitiesFiltered(
  categoryIds: string[] = [],
  moodIds: string[] = []
): Promise<Activity[]> {
  try {
    const snapshot = await getDocs(collection(db, "Activity"));
    let activities: Activity[] = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Handle single or multiple mood references
      let moodIds: string[] = [];
      if (Array.isArray(data.moodID)) {
        moodIds = data.moodID.map((m: any) => m.id); // array of refs
      } else if (data.moodID) {
        moodIds = [data.moodID.id]; // single ref
      }

      return {
        id: doc.id,
        activityTitle: data.activityTitle,
        description: data.description,
        createdBy: data.createdBy,
        moodIds,
        categoryId: data.categoryID?.id || "",
        emoji: data.emoji,
      };
    });

    // Filtering
    if (categoryIds.length > 0) {
      activities = activities.filter((a) => categoryIds.includes(a.categoryId));
    }
    if (moodIds.length > 0) {
      activities = activities.filter((a) =>
        a.moodIds.some((m) => moodIds.includes(m)) //   allow multiple moods
      );
    }

    console.log("Total activities after filter:", activities.length);
    return activities;
  } catch (error) {
    console.error("Error fetching filtered activities:", error);
    return [];
  }
}

import { addDoc, doc } from "firebase/firestore";

export async function createActivity(params: {
  activityTitle: string;          // use the same field name as Firestore
  description?: string;
  categoryId: string;             // collection: Category
  moodIds: string[];              // collection: Mood (array of refs)
  createdBy?: string;
}) {
  const { activityTitle, description, categoryId, moodIds, createdBy} = params;

  const categoryRef = doc(db, "Category", categoryId);
  const moodRefs = moodIds.map((id) => doc(db, "Mood", id));

  const ref = await addDoc(collection(db, "Activity"), {
    activityTitle,
    description: description ?? "",
    categoryID: categoryRef,  
    moodID: moodRefs,         // array of DocumentReferences
    createdBy,
   
  });

  
  return {
    id: ref.id,
    activityTitle,
    description: description ?? "",
    categoryId,
    moodIds,
    createdBy,
  };
}

export async function deleteActivity(id: string) {
  try {
    await deleteDoc(doc(db, "Activity", id));
    return true;
  } catch (error) {
    console.error("Error deleting activity:", error);
    throw error;
  }
}

export async function updateActivity(id: string, data: Partial<Activity>) {
  try {
    await updateDoc(doc(db, "Activity", id), data);
    return true;
  } catch (error) {
    console.error("Error updating activity:", error);
    throw error;
  }
}