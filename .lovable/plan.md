# Sales → Profit System Restructure

আপনার চাহিদা অনুযায়ী চারটে অংশে কাজ হবে:

---

## ১. Lead Conversion → Sale (অটো)

**আলাদা Sale entry আর থাকবে না।** যখন একটা lead status `converted` হবে, তখনই sale তৈরি হবে।

- Lead এর `lead_course` দেখে courses table থেকে সেই কোর্সের default price অটো-ফেচ হবে
- Conversion dialog-এ একটা `Final Amount` ফিল্ড থাকবে — default ভাবে কোর্স price বসে থাকবে, কিন্তু custom amount লেখা যাবে (special discount/premium pricing)
- কে sale closed করল = lead এর `assigned_to` (already tracked)
- Conversion date + final amount + closed_by সব এক জায়গায় store হবে

**কোথায় store হবে:** `leads` টেবিলেই নতুন কলাম `final_sale_amount`, `converted_at`, `converted_by` যোগ হবে। আলাদা sales টেবিলের দরকার নেই।

---

## ২. Expenses Tracking

নতুন একটা `expenses` table:
- `category` (enum: office, advertising, salary, utilities, software, other)
- `amount`, `description`, `expense_date`, `created_by`
- শুধু sales-admin add/edit/delete করতে পারবে; executive read-only

UI: নতুন একটা route `/sales/expenses` — list + add/edit modal + category-wise filter.

---

## ৩. Reports সেকশন আপডেট

Reports পেজে নতুন ৩টা সেকশন যোগ হবে:

**A. Monthly Sales by Executive**
- প্রতি sales executive-এর জন্য: কতগুলো sale, মোট টাকা, average deal size
- Month picker দিয়ে ফিল্টার

**B. Expenses Breakdown**
- Category-wise total (pie/bar chart)
- Monthly trend

**C. Profit Summary (দিন শেষের হিসাব)**
- Total Revenue (converted leads এর final_sale_amount sum)
- Total Expenses
- **Net Profit = Revenue − Expenses**
- Date range selector (today / this month / custom)

---

## ৪. Database Migrations

```sql
-- leads-এ sale fields
ALTER TABLE leads ADD COLUMN final_sale_amount NUMERIC(10,2);
ALTER TABLE leads ADD COLUMN converted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN converted_by UUID REFERENCES auth.users(id);

-- expenses table
CREATE TYPE expense_category AS ENUM ('office','advertising','salary','utilities','software','other');
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category expense_category NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: admin all, executive select only
```

---

## ৫. Files to change

- **Migration**: leads alter + expenses table + RLS
- **StatusChangeDialog.tsx**: when status = converted → show `Final Amount` field with course price prefilled
- **NEW** `src/routes/sales.expenses.tsx` + `ExpensesPage.tsx` + `AddExpenseModal.tsx`
- **SalesSidebar.tsx**: "Expenses" menu item (admin only)
- **ReportsPage.tsx**: Executive performance + Expenses + Profit সেকশন যোগ

---

## প্রশ্ন (শুরুর আগে কনফার্ম)

1. **Custom amount override** — শুধু admin করতে পারবে নাকি executive-ও পারবে?
2. **Expenses entry** — শুধু admin, তাই তো? (executive-রা expense add করতে পারবে না)
3. **Sale edit** — একবার converted হয়ে গেলে final_amount পরে edit করা যাবে (admin) নাকি locked থাকবে?

Confirm করলে migration থেকে শুরু করব।
