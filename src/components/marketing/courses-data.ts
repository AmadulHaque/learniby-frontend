import c1 from "@/assets/marketing/c1.webp";
import c2 from "@/assets/marketing/c2.webp";
import c3 from "@/assets/marketing/c3.webp";
import c4 from "@/assets/marketing/c4.webp";
import c5 from "@/assets/marketing/c5.webp";

export interface MarketingCourse {
  slug: string;
  img: string;
  badge: string; // e.g. "Teacher Training" or "বয়স: ৮-১২ বছর"
  time: string;  // e.g. "6 Months"
  title: string;
  desc: string;
}

export const MARKETING_COURSES: MarketingCourse[] = [
  { slug: "certified-abacus-trainer-course", img: c1, badge: "Teacher Training", time: "6 Months", title: "Certified Abacus Trainer Course", desc: "সার্টিফাইড অ্যাবাকাস ট্রেইনার হয়ে নিজের ক্যারিয়ার গড়ুন।" },
  { slug: "phonics-spoken-english-for-junior", img: c2, badge: "বয়স: ৮-১২ বছর", time: "06 Months", title: "Phonics & Spoken English for Junior", desc: "সঠিক উচ্চারণে ফ্লুয়েন্টলি ইংরেজিতে কথা বলা শিখুন।" },
  { slug: "abacus-mental-math-and-brain-development-for-kids", img: c3, badge: "বয়স: ৫-৮ বছর", time: "05 Months", title: "Abacus Mental Math & Brain Development for Kids", desc: "ক্যালকুলেটর ছাড়াই দ্রুত গণিত করার জাদুকরী কৌশল শিখুন।" },
  { slug: "abacus-mental-math-brain-development-for-junior", img: c4, badge: "বয়স: ৮-১৪ বছর", time: "02 Months", title: "Abacus Mental Math & Brain Development for Junior", desc: "গণিতের ভীতি কাটিয়ে মেধা ও মনোযোগ বৃদ্ধির সেরা উপায়।" },
  { slug: "phonics-spoken-english-for-kids", img: c5, badge: "বয়স: ৪-৭ বছর", time: "06 Months", title: "Phonics-&-Spoken-English-for-Kids", desc: "খেলার ছলে শুদ্ধ উচ্চারণে ইংরেজি পড়ার ভিত্তি গড়ুন।" },
];
