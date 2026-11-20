import { Subject } from './types';

// Demo Google Drive PDF link provided by the user (direct stream link)
export const DEMO_PDF_URL = "https://drive.google.com/uc?export=download&id=1PPu7nFx8EazI5uo6BmcN_jk_FzHD1CGp";

export const SUBJECTS_DATA: Record<string, Subject> = {
  "1": {
    id: "1",
    name: "মঙ্গলাচরণ",
    icon: "🕉️",
    chapters: [
      { id: "1.1", title: "1মঙ্গলাচরণ", pdfUrl: "https://drive.google.com/uc?export=download&id=11Oz_C4HplRg9LyyDvtxxtoGAQdoUpYPz" }
    ],
    altChapters: [
      { id: "A1.1", title: "1. Mangalacharan (Invocation)", pdfUrl: "https://drive.google.com/uc?export=download&id=11Oz_C4HplRg9LyyDvtxxtoGAQdoUpYPz" }
    ]
  },
  "2": {
    id: "2",
    name: "গীতা - প্রবাহ",
    icon: "🌊",
    chapters: [
      { id: "2.1", title: "1গীতা - প্রবাহ", pdfUrl: "https://drive.google.com/uc?export=download&id=1ZCXOQsdS_zt2BZpAZ1_xOJYponCdubOt" }
    ],
    altChapters: [
      { id: "A2.1", title: "1. Gita Flow", pdfUrl: "https://drive.google.com/uc?export=download&id=1ZCXOQsdS_zt2BZpAZ1_xOJYponCdubOt" }
    ]
  },
  "3": {
    id: "3",
    name: "শ্রীমদ্ভগবদ্গীতা যথাযথ সম্পূর্ণ",
    icon: "📖",
    chapters: [
      { id: "3.0", title: "ভূমিকা", pdfUrl: "https://drive.google.com/uc?export=download&id=1nIyafxgltVhgVBiQnvXnJkx9ybuODD2f" },
      { id: "3.1", title: "১. প্রথম অধ্যায় অর্জুন বিষাদ-যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=10-qPI8FSCkqmzoBpC4B0Gxgvkr8fyTex", rotation: 180 },
      { id: "3.2", title: "২. ২য় অধ্যায়-সাংখ্য-যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=18svAa7xIP-YvOthtCNLRZWq6w76DB0f0", rotation: 180 },
      { id: "3.3", title: "৩. ৩য় অধ্যায়-কর্মযোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=10p4OAuPALZ8IpeKWQO22X4VQNIsPzR6Y", rotation: 180 },
      { id: "3.4", title: "৪.৪র্থ অধ্যায়-জ্ঞান যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1qf4qnXzCwhHzvLvgz4oaYAmzk9vtMwkB", enhanceScan: true },
      { id: "3.5", title: "৫. ৫ম অধ্যায়-কর্মসন্ন্যাস-যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1MI3J6lQ2NOLIdJB78HD7HN74RoK7yWhs", enhanceScan: true },
      { id: "3.6", title: "৬. ষষ্ঠ-অধ্যায়-ধ্যানযোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1uSMMUUY-qrBJr8gfEOjMWMLgauz1t-w3", enhanceScan: true },
      { id: "3.7", title: "৭. সপ্তম-অধ্যায়-বিজ্ঞান-যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1wVnZ8w28sXBA6PCwNdCgRqKx3hl5z1yR", enhanceScan: true },
      { id: "3.8", title: "৮. অষ্টম-অধ্যায়-অক্ষরব্রহ্ম-যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=14BdE-2H_OdQb-dcZKPMZMrQtpAjKP1G3", enhanceScan: true },
      { id: "3.9", title: "৯. নবম-অধ্যায়-রাজগুহ্য-যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1UTo_En6z7AANRT72tflCaeh8dUMgBT9N", enhanceScan: true },
      { id: "3.10", title: "১০. দশম অধ্যায়-বিভূতি-যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1hnRFI-j9GcpUBOjiWytDRFqcfmDVzeQO", enhanceScan: true },
      { id: "3.11", title: "১১. একাদশ-অধ্যায়-বিশ্বরূপ-দর্শন-যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=10wG5KTrx8bWQIqpqBKgXlXsVJBwX_dsB", enhanceScan: true },
      { id: "3.12", title: "১২. দ্বাদশ অধ্যায়-ভক্তিযোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1GELtMatZJJj0RYSS4Jihbk5YmlSBJUWH", enhanceScan: true },
      { id: "3.13", title: "১৩. ত্রয়োদশ অধ্যায়-প্রকৃতি-পুরুষ-বিবেকযোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1K1P82cV0dBh006MUp0d2du4I-O-IDDf1", enhanceScan: true },
      { id: "3.14", title: "১৪. চতুর্দশ অধ্যায়-গুণত্রয়-বিভাগ-যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1dRMsuMnzJ7kC6wvGpcYpXvh9obRoGQfs", enhanceScan: true },
      { id: "3.15", title: "১৫. পঞ্চদশ অধ্যায়-পুরুষোত্তম-যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1r0KulSwqdI-Owc25_jEfPAGAi1FZzIQf", enhanceScan: true },
      { id: "3.16", title: "১৬. ষোড়শ অধ্যায়-দৈবাসুর-সম্পদ-বিভাগযোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1DPcdowzqtpK2SYEcNhAIfr3ZyjL34pZu", enhanceScan: true },
      { id: "3.17", title: "১৭. সপ্তদশ অধ্যায়-শ্রদ্ধাত্রয়-বিভাগ-যোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1xaFFFeumZJoc5twgbp3pcG75JiwaB733", enhanceScan: true },
      { id: "3.18", title: "১৮. অষ্টাদশ অধ্যায়-মোক্ষযোগ", pdfUrl: "https://drive.google.com/uc?export=download&id=1URuErakbHGnUCPsiCh35k2G3FlPM_n_v", enhanceScan: true }
    ],
    altChapters: [
      { id: "A3.0", title: "Introduction", pdfUrl: "https://drive.google.com/uc?export=download&id=1brxwzmUsfvxWDSuI-PrsrXCoxbvxN2Ip" },
      { id: "A3.1", title: "1. Chapter One: Arjuna Vishada Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1F4PD1LwKYArDPhFCOFalN2w3p5934IlB" },
      { id: "A3.2", title: "2. Chapter Two: Sankhya Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1emcNydYqrcdGtHJ8ecvFZSFxpuxBVgpP" },
      { id: "A3.3", title: "3. Chapter Three: Karma Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1NvHzdfA9HSFjEvnW_2FEN6EdqmAIS1Jl" },
      { id: "A3.4", title: "4. Chapter Four: Jnana Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=12aJQhrwoXCBKcaetfgl2krCtkoUhFtvu" },
      { id: "A3.5", title: "5. Chapter Five: Karma-Sannyasa Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1aiFarnBJLfoUda1dLyLhSAQck8Q-5H80" },
      { id: "A3.6", title: "6. Chapter Six: Dhyana Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1Rx2GKpjF5iJqJ5a6catm6xvEHO4BII3i" },
      { id: "A3.7", title: "7. Chapter Seven: Vijnana Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1sHFD1qL01Shwh_sokxfFU7rtp-tRiwaB" },
      { id: "A3.8", title: "8. Chapter Eight: Akshara-Brahma Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1Pf8KSoFA7ruo_kNUsb0eb7I6MiMR6xR8" },
      { id: "A3.9", title: "9. Chapter Nine: Raja-Guhya Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1jNuXN9eDID4FkQcu_kwpWPdnZF3wp5nm" },
      { id: "A3.10", title: "10. Chapter Ten: Vibhuti Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=19tVMXr94JZFoiVW5JWHGk40XabVJt3no" },
      { id: "A3.11", title: "11. Chapter Eleven: Vishvarupa-Darshana Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1tcWMEWMVfWnzuQG3Is2JYs1tF18E0d1n" },
      { id: "A3.12", title: "12. Chapter Twelve: Bhakti Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1pqpYK-apLcThC5BdYbOl8PQakaQ71xWU" },
      { id: "A3.13", title: "13. Chapter Thirteen: Prakriti-Purusha Viveka Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1Faccv0DNOtUk-Bvz_TOY-MRPjuoqF5Us" },
      { id: "A3.14", title: "14. Chapter Fourteen: Guna-Traya Vibhaga Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=19HnlLJ-g1risqczLuX2Ds_TAMygVO8_k" },
      { id: "A3.15", title: "15. Chapter Fifteen: Purushottama Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1MtjfWjslAGXNVFc-yqMJm-Wc2tigEMGk" },
      { id: "A3.16", title: "16. Chapter Sixteen: Daivasura-Sampad Vibhaga Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1VCLgoTO3jhLn3IoiCWssqq3dnMuw1wMD" },
      { id: "A3.17", title: "17. Chapter Seventeen: Shraddha-Traya Vibhaga Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1FM04MrQRjoYufzveh2mEY-7wOB9rKDce" },
      { id: "A3.18", title: "18. Chapter Eighteen: Moksha Yoga", pdfUrl: "https://drive.google.com/uc?export=download&id=1Gv_yhPSsHyNrP5VUjjJcmoXIcem-LGVe" }
    ]
  },
  "4": {
    id: "4",
    name: "নামহট্ট_পরিচয়",
    icon: "📜",
    chapters: [
      { id: "4.1", title: "1 সূচিপত্র", pdfUrl: "https://drive.google.com/uc?export=download&id=1CGDb8PGoPZeL_bnCZVenzwfFQ49OZ4hv" },
      { id: "4.2", title: "2 নামহট্ট_পরিচয়", pdfUrl: "https://drive.google.com/uc?export=download&id=1I5kyxqnFTloV-XZC32TxncB-yUbt4Q_1" }
    ],
    altChapters: [
      { id: "A4.1", title: "1. Table of Contents", pdfUrl: "https://drive.google.com/uc?export=download&id=1CGDb8PGoPZeL_bnCZVenzwfFQ49OZ4hv" },
      { id: "A4.2", title: "2. Namahatta: Introduction", pdfUrl: "https://drive.google.com/uc?export=download&id=1I5kyxqnFTloV-XZC32TxncB-yUbt4Q_1" }
    ]
  },
  "5": {
    id: "5",
    name: "প্রতিদিনের নিত্য প্রয়োজনীয় মন্ত্র সমূহ",
    icon: "🙏",
    chapters: [
      { id: "5.1", title: "1নিত্য প্রয়োজনীয় মন্ত্র", pdfUrl: "https://drive.google.com/uc?export=download&id=1iXeanvQgN2iUYqbMHMDEZoR6pcHKziB8" }
    ],
    altChapters: [
      { id: "A5.1", title: "1. Daily Essential Mantras", pdfUrl: "https://drive.google.com/uc?export=download&id=1iXeanvQgN2iUYqbMHMDEZoR6pcHKziB8" }
    ]
  }
};
