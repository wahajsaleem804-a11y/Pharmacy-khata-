export type Locale = "en" | "ur-ro" | "ur";

export interface Dictionary {
  common: {
    appName: string;
    tagline: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    search: string;
    filter: string;
    loading: string;
    actions: string;
    status: string;
    date: string;
    notes: string;
    all: string;
    print: string;
    exportPdf: string;
    confirm: string;
    restore: string;
    yes: string;
    no: string;
    back: string;
    currency: string;
  };
  navigation: {
    dashboard: string;
    newTransaction: string;
    dailyKhata: string;
    pharmacies: string;
    returns: string;
    dailyClosing: string;
    activityHistory: string;
    settings: string;
    logout: string;
    login: string;
  };
  dashboard: {
    receivedToday: string;
    givenToday: string;
    totalReceivable: string;
    totalPayable: string;
    recentTransactions: string;
    quickActions: string;
    dailyOverview: string;
    noTransactionsYet: string;
    netPosition: string;
  };
  transactions: {
    title: string;
    newTitle: string;
    type: string;
    received: string;
    given: string;
    pharmacy: string;
    selectPharmacy: string;
    invoiceNumber: string;
    addMedicine: string;
    removeMedicine: string;
    medicineName: string;
    quantity: string;
    packQuantity: string;
    looseQuantity: string;
    packSize: string;
    retailPrice: string;
    discountPercent: string;
    discountAmount: string;
    finalPrice: string;
    lineTotal: string;
    subtotal: string;
    grandTotal: string;
    saveSuccess: string;
    emptyItemsError: string;
  };
  returns: {
    title: string;
    processReturn: string;
    selectTransaction: string;
    selectMedicine: string;
    returnQuantity: string;
    returnLooseQuantity: string;
    maxReturnable: string;
    originalPrice: string;
    returnAmount: string;
    reason: string;
    returnSuccess: string;
    overQuantityError: string;
  };
  pharmacies: {
    title: string;
    addPharmacy: string;
    editPharmacy: string;
    name: string;
    contactNumber: string;
    address: string;
    openingBalance: string;
    balanceType: string;
    payable: string;
    receivable: string;
    neutral: string;
    netBalance: string;
    viewKhata: string;
    deleteWarning: string;
  };
  khata: {
    title: string;
    dailyKhata: string;
    dailyClosing: string;
    runningBalance: string;
    debit: string;
    credit: string;
    totalTransactions: string;
    netPayable: string;
    netReceivable: string;
    settled: string;
    closingSummary: string;
  };
  activity: {
    title: string;
    action: string;
    record: string;
    table: string;
    changes: string;
    timestamp: string;
    user: string;
  };
  settings: {
    title: string;
    language: string;
    profile: string;
    fullName: string;
    businessName: string;
    phone: string;
    savedSuccessfully: string;
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    common: {
      appName: "Pharmacy Khata",
      tagline: "Inter-Pharmacy Medicine Exchange & Financial Ledger",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      view: "View",
      search: "Search...",
      filter: "Filter",
      loading: "Loading...",
      actions: "Actions",
      status: "Status",
      date: "Date",
      notes: "Notes",
      all: "All",
      print: "Print",
      exportPdf: "Export PDF",
      confirm: "Confirm",
      restore: "Restore",
      yes: "Yes",
      no: "No",
      back: "Back",
      currency: "Rs.",
    },
    navigation: {
      dashboard: "Dashboard",
      newTransaction: "New Transaction",
      dailyKhata: "Daily Khata",
      pharmacies: "Pharmacies",
      returns: "Returns",
      dailyClosing: "Daily Closing",
      activityHistory: "Activity History",
      settings: "Settings",
      logout: "Sign Out",
      login: "Sign In",
    },
    dashboard: {
      receivedToday: "Medicines Received Today",
      givenToday: "Medicines Given Today",
      totalReceivable: "Total Receivable",
      totalPayable: "Total Payable",
      recentTransactions: "Recent Transactions",
      quickActions: "Quick Actions",
      dailyOverview: "Daily Overview",
      noTransactionsYet: "No transactions recorded yet.",
      netPosition: "Net Financial Position",
    },
    transactions: {
      title: "Medicine Transactions",
      newTitle: "New Medicine Transaction",
      type: "Transaction Type",
      received: "Medicine Received (Payable)",
      given: "Medicine Given (Receivable)",
      pharmacy: "Pharmacy",
      selectPharmacy: "Select Pharmacy",
      invoiceNumber: "Invoice / Ref Number",
      addMedicine: "Add Medicine Row",
      removeMedicine: "Remove",
      medicineName: "Medicine Name",
      quantity: "Qty",
      packQuantity: "Pack Qty",
      looseQuantity: "Loose Qty",
      packSize: "Pack Size",
      retailPrice: "Retail Price",
      discountPercent: "Disc %",
      discountAmount: "Disc Rs",
      finalPrice: "Final Price",
      lineTotal: "Total",
      subtotal: "Subtotal",
      grandTotal: "Grand Total",
      saveSuccess: "Transaction recorded successfully.",
      emptyItemsError: "Please add at least one medicine item.",
    },
    returns: {
      title: "Medicine Returns",
      processReturn: "Process Return",
      selectTransaction: "Select Original Transaction",
      selectMedicine: "Select Medicine to Return",
      returnQuantity: "Return Quantity",
      returnLooseQuantity: "Return Loose Qty",
      maxReturnable: "Max Returnable",
      originalPrice: "Original Unit Price",
      returnAmount: "Return Credit Amount",
      reason: "Reason for Return",
      returnSuccess: "Return processed successfully and ledger updated.",
      overQuantityError: "Return quantity exceeds available item quantity.",
    },
    pharmacies: {
      title: "Pharmacies Directory",
      addPharmacy: "Add Pharmacy",
      editPharmacy: "Edit Pharmacy",
      name: "Pharmacy Name",
      contactNumber: "Phone Number",
      address: "Address",
      openingBalance: "Opening Balance",
      balanceType: "Balance Type",
      payable: "Payable (You owe)",
      receivable: "Receivable (They owe)",
      neutral: "Neutral (Rs. 0)",
      netBalance: "Net Balance",
      viewKhata: "View Khata Statement",
      deleteWarning: "Are you sure you want to remove this pharmacy?",
    },
    khata: {
      title: "Pharmacy Khata Ledger",
      dailyKhata: "Daily Khata Ledger",
      dailyClosing: "Daily Closing & Audit",
      runningBalance: "Running Balance",
      debit: "Debit",
      credit: "Credit",
      totalTransactions: "Total Transactions",
      netPayable: "Net Payable",
      netReceivable: "Net Receivable",
      settled: "Account Settled",
      closingSummary: "Closing Summary",
    },
    activity: {
      title: "Complete Activity Audit History",
      action: "Action",
      record: "Record ID",
      table: "Table Name",
      changes: "Data Changes",
      timestamp: "Timestamp",
      user: "User",
    },
    settings: {
      title: "Settings",
      language: "Select Language",
      profile: "Business Profile",
      fullName: "Your Name",
      businessName: "Pharmacy Business Name",
      phone: "Phone Number",
      savedSuccessfully: "Settings saved successfully.",
    },
  },
  "ur-ro": {
    common: {
      appName: "Pharmacy Khata",
      tagline: "Pharmacies kay darmayan dawai ka lain dain aur hisaab kitaab",
      save: "Mehfooz Karein",
      cancel: "Mansookh",
      delete: "Khatam Karein",
      edit: "Tabdeel Karein",
      view: "Dekhein",
      search: "Talaash karein...",
      filter: "Filter",
      loading: "Loading ho rahi hai...",
      actions: "Kaarwai",
      status: "Haalat",
      date: "Tareekh",
      notes: "Wazahat / Notes",
      all: "Tamam",
      print: "Print Karein",
      exportPdf: "PDF Banayein",
      confirm: "Tasdeeq Karein",
      restore: "Bahaal Karein",
      yes: "Haan",
      no: "Nahi",
      back: "Wapis",
      currency: "Rs.",
    },
    navigation: {
      dashboard: "Dashboard",
      newTransaction: "Naya Lain Dain",
      dailyKhata: "Rozana Khata",
      pharmacies: "Pharmacies List",
      returns: "Wapsi (Returns)",
      dailyClosing: "Rozana Closing",
      activityHistory: "Activity History",
      settings: "Settings",
      logout: "Log Out",
      login: "Log In",
    },
    dashboard: {
      receivedToday: "Aaj Jo Dawai Mili",
      givenToday: "Aaj Jo Dawai Di",
      totalReceivable: "Kul Lainay Walay (Receivable)",
      totalPayable: "Kul Dainay Walay (Payable)",
      recentTransactions: "Haalia Lain Dain",
      quickActions: "Fauri Kaarwai",
      dailyOverview: "Rozana Jaiza",
      noTransactionsYet: "Abhi koi lain dain darj nahi hua.",
      netPosition: "Kul Net Hisaab",
    },
    transactions: {
      title: "Dawai Ka Lain Dain",
      newTitle: "Naya Lain Dain Darj Karein",
      type: "Lain Dain Ki Qisam",
      received: "Dawai Li (Payable - Hum nay dainay hain)",
      given: "Dawai Di (Receivable - Unho nay dainay hain)",
      pharmacy: "Pharmacy",
      selectPharmacy: "Pharmacy Chunein",
      invoiceNumber: "Invoice / Bill Number",
      addMedicine: "Dawai Ki Line Shamil Karein",
      removeMedicine: "Hatayein",
      medicineName: "Dawai Ka Naam",
      quantity: "Tadaad (Qty)",
      packQuantity: "Pack Qty",
      looseQuantity: "Khula Qty",
      packSize: "Pack Size",
      retailPrice: "Retail Qeemat",
      discountPercent: "Discount %",
      discountAmount: "Discount Rs",
      finalPrice: "Aakhri Qeemat",
      lineTotal: "Kul Qeemat",
      subtotal: "Subtotal",
      grandTotal: "Kul Rakam",
      saveSuccess: "Lain dain kamyabi say darj ho gaya.",
      emptyItemsError: "Barah-e-karam kam az kam aik dawai shamil karein.",
    },
    returns: {
      title: "Dawai Wapsi (Returns)",
      processReturn: "Wapsi Darj Karein",
      selectTransaction: "Asal Lain Dain Chunein",
      selectMedicine: "Wapis honay wali dawai chunein",
      returnQuantity: "Wapsi Ki Tadaad",
      returnLooseQuantity: "Wapasi Khula Qty",
      maxReturnable: "Hadd Tadaad",
      originalPrice: "Asal Qeemat",
      returnAmount: "Wapsi Ki Kul Rakam",
      reason: "Wapsi Ki Wajah",
      returnSuccess: "Wapsi kamyabi say darj ho gayi aur khata theek ho gaya.",
      overQuantityError: "Wapsi ki tadaad asal bachay huay samaan say zyada hai.",
    },
    pharmacies: {
      title: "Pharmacies Ki Fehrist",
      addPharmacy: "Nayi Pharmacy Shamil Karein",
      editPharmacy: "Pharmacy Tabdeel Karein",
      name: "Pharmacy Ka Naam",
      contactNumber: "Phone Number",
      address: "Pata (Address)",
      openingBalance: "Pichla Baqaya (Opening Balance)",
      balanceType: "Baqaya Ki Qisam",
      payable: "Dainay Hain (Payable)",
      receivable: "Lainay Hain (Receivable)",
      neutral: "Barabar (Rs. 0)",
      netBalance: "Net Baqaya",
      viewKhata: "Khata Dekhein",
      deleteWarning: "Kya aap waqai is pharmacy ko hatana chahte hain?",
    },
    khata: {
      title: "Pharmacy Khata Statement",
      dailyKhata: "Rozana Khata Register",
      dailyClosing: "Rozana Closing Jaiza",
      runningBalance: "Baqaya (Running Balance)",
      debit: "Debit",
      credit: "Credit",
      totalTransactions: "Kul Lain Dain",
      netPayable: "Hum nay dainay hain (Net Payable)",
      netReceivable: "Unho nay dainay hain (Net Receivable)",
      settled: "Hisaab Barabar",
      closingSummary: "Closing Summary",
    },
    activity: {
      title: "Mukammal Activity Record",
      action: "Amal (Action)",
      record: "Record ID",
      table: "Table",
      changes: "Tabdeeli",
      timestamp: "Waqt",
      user: "User",
    },
    settings: {
      title: "Settings",
      language: "Zaban Chunein",
      profile: "Karobar Ki Maloomat",
      fullName: "Aap Ka Naam",
      businessName: "Medical Store / Pharmacy Ka Naam",
      phone: "Phone Number",
      savedSuccessfully: "Settings mehfooz ho gayin.",
    },
  },
  ur: {
    common: {
      appName: "فارمیسی کھاتہ",
      tagline: "فارمیسیوں کے مابین ادویات کا لین دین اور مالیاتی حساب کتاب",
      save: "محفوظ کریں",
      cancel: "منسوخ",
      delete: "حذف کریں",
      edit: "ترمیم کریں",
      view: "دیکھیں",
      search: "تلاش کریں...",
      filter: "فلٹر",
      loading: "لوڈ ہو رہا ہے...",
      actions: "کارروائی",
      status: "حالت",
      date: "تاریخ",
      notes: "وضاحت / نوٹس",
      all: "تمام",
      print: "پرنٹ کریں",
      exportPdf: "پی ڈی ایف بنائیں",
      confirm: "تصدیق کریں",
      restore: "بحال کریں",
      yes: "ہاں",
      no: "نہیں",
      back: "واپس",
      currency: "روپے",
    },
    navigation: {
      dashboard: "ڈیش بورڈ",
      newTransaction: "نیا لین دین",
      dailyKhata: "روزانہ کھاتہ",
      pharmacies: "فارمیسیز",
      returns: "واپسی (ریٹرنز)",
      dailyClosing: "روزانہ کلوزنگ",
      activityHistory: "سرگرمی ہسٹری",
      settings: "سیٹنگز",
      logout: "لاگ آؤٹ",
      login: "لاگ ان",
    },
    dashboard: {
      receivedToday: "آج موصول شدہ ادویات",
      givenToday: "آج دی گئی ادویات",
      totalReceivable: "کل وصول طلب (Receivable)",
      totalPayable: "کل واجب الادا (Payable)",
      recentTransactions: "حالیہ لین دین",
      quickActions: "فوری اقدامات",
      dailyOverview: "روزانہ جائزہ",
      noTransactionsYet: "ابھی تک کوئی لین دین درج نہیں ہوا۔",
      netPosition: "نیٹ مالیاتی پوزیشن",
    },
    transactions: {
      title: "ادویات کا لین دین",
      newTitle: "نیا لین دین درج کریں",
      type: "لین دین کی قسم",
      received: "دوا موصول کی (ہم نے رقم دینی ہے - Payable)",
      given: "دوا دی (ہم نے رقم لینی ہے - Receivable)",
      pharmacy: "فارمیسی",
      selectPharmacy: "فارمیسی منتخب کریں",
      invoiceNumber: "انوائس / بل نمبر",
      addMedicine: "دوا کی لائن شامل کریں",
      removeMedicine: "ہٹائیں",
      medicineName: "دوا کا نام",
      quantity: "تعداد",
      packQuantity: "پیک تعداد",
      looseQuantity: "کھلا تعداد",
      packSize: "پیک سائز",
      retailPrice: "ریٹیل قیمت",
      discountPercent: "ڈسکاؤنٹ ٪",
      discountAmount: "ڈسکاؤنٹ رقم",
      finalPrice: "حتمی قیمت",
      lineTotal: "کل قیمت",
      subtotal: "سب ٹوٹل",
      grandTotal: "کل رقم",
      saveSuccess: "لین دین کامیابی سے درج کر لیا گیا۔",
      emptyItemsError: "براہ کرم کم از کم ایک دوا شامل کریں۔",
    },
    returns: {
      title: "ادویات کی واپسی",
      processReturn: "واپسی درج کریں",
      selectTransaction: "اصل لین دین منتخب کریں",
      selectMedicine: "واپس ہونے والی دوا منتخب کریں",
      returnQuantity: "واپسی کی تعداد",
      returnLooseQuantity: "واپسی کھلا تعداد",
      maxReturnable: "زیادہ سے زیادہ واپسی",
      originalPrice: "اصل قیمت",
      returnAmount: "واپسی کی کل رقم",
      reason: "واپسی کی وجہ",
      returnSuccess: "واپسی کامیابی سے درج ہو گئی اور کھاتہ درست ہو گیا۔",
      overQuantityError: "واپسی کی تعداد اصل باقی ماندہ مقدار سے زیادہ ہے۔",
    },
    pharmacies: {
      title: "فارمیسیز کی فہرست",
      addPharmacy: "نئی فارمیسی شامل کریں",
      editPharmacy: "فارمیسی میں ترمیم کریں",
      name: "فارمیسی کا نام",
      contactNumber: "فون نمبر",
      address: "پتہ",
      openingBalance: "پچھلا بقایا (اوپننگ بیلنس)",
      balanceType: "بیلنس کی قسم",
      payable: "ہم نے دینے ہیں (Payable)",
      receivable: "ہم نے لینے ہیں (Receivable)",
      neutral: "برابر (0 روپے)",
      netBalance: "نیٹ بقایا",
      viewKhata: "کھاتہ دیکھیں",
      deleteWarning: "کیا آپ واقعی اس فارمیسی کو حذف کرنا چاہتے ہیں؟",
    },
    khata: {
      title: "فارمیسی کھاتہ اسٹیٹمنٹ",
      dailyKhata: "روزانہ کھاتہ رجسٹر",
      dailyClosing: "روزانہ کلوزنگ اور آڈٹ",
      runningBalance: "رننگ بیلنس",
      debit: "ڈیبٹ",
      credit: "کریڈٹ",
      totalTransactions: "کل لین دین",
      netPayable: "نیٹ واجب الادا (ہم نے دینے ہیں)",
      netReceivable: "نیٹ وصول طلب (ہم نے لینے ہیں)",
      settled: "کھاتہ برابر ہے",
      closingSummary: "کلوزنگ سمری",
    },
    activity: {
      title: "سرگرمیوں کا مکمل ریکارڈ",
      action: "عمل",
      record: "ریکارڈ آئی ڈی",
      table: "ٹیبل",
      changes: "تبدیلیاں",
      timestamp: "وقت",
      user: "صارف",
    },
    settings: {
      title: "سیٹنگز",
      language: "زبان منتخب کریں",
      profile: "کاروباری معلومات",
      fullName: "آپ کا نام",
      businessName: "میڈیکل اسٹور / فارمیسی کا نام",
      phone: "فون نمبر",
      savedSuccessfully: "سیٹنگز کامیابی سے محفوظ ہو گئیں۔",
    },
  },
};
