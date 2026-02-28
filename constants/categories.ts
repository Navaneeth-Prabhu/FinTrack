import { Category } from "@/types";
import { Book, Briefcase, Car, Coffee, Gift, GraduationCap, Heart, Home, Pizza, ShoppingBag, ShoppingCart } from "lucide-react-native";

export const emojiConstants = [
  '📄', '⛽', '⚡', '💡', '🍟', '🍔', '🚚', '🚗', '🚌', '🚕', '🚈', '🏍️', '🚢', '🛥️', '🪥', '🚿', '🚽', '🏨',
  '🏥', '🪒', '♻️', '💲', '🍞', '🥪', '🍗', '🥩', '🍖', '🍜', '🍰', '🍼', '📚', '📰', '👓',
  '👔', '👗', '🎁', '🎊', '🎃', '🎨', '🛝', '🎠', '🎪', '🎢', '🎡', '🐶', '🐕', '🐱', '🐈',
  '🥋', '🎓', '💼', '💸'
]

export const categoryIcons = {
  emoji: [
    '📄', '⛽', '⚡', '💡', '🍟', '🍔', '🚚', '🚗', '🚌', '🚕', '🚈', '🏍️', '🚢', '🛥️',
    '🪥', '🚿', '🚽', '🏨', '🏥', '🪒', '♻️', '💲', '🍞', '🥪', '🍗', '🥩', '🍖', '🍜',
    '🍰', '🍼', '📚', '📰', '👓', '👔', '👗', '🎁', '🎊', '🎃', '🎨', '🛝', '🎠', '🎪',
    '🎢', '🎡', '🐶', '🐕', '🐱', '🐈', '🥋', '🎓', '💼', '💸'
  ],
  lucide: [
    { name: 'heart', component: Heart },
    { name: 'coffee', component: Coffee },
    { name: 'car', component: Car },
    { name: 'home', component: Home },
    { name: 'book', component: Book },
    { name: 'briefcase', component: Briefcase },
    { name: 'pizza', component: Pizza },
    { name: 'gift', component: Gift },
    { name: 'shopping', component: ShoppingCart },
    { name: 'graduation-cap', component: GraduationCap },
    // Add more icons as needed
  ]
};

export const ColorsConstants = [
  '#0B7189',
  '#FFD275',
  '#DB5A42',
  '#ABDF75',
  '#DCABDF',
  '#74D3AE',
  '#D5A021',
  '#136F63',
  '#FC9E4F',
  '#677DB7',
  '#CF4D6F',
  '#B1EDE8',
  '#87D68D',
  '#C98BB9',
  '#81ADC8',

]

export const categoryConstants: Category[] = [
  { id: '1', name: 'Bills & Utilities', icon: '📄', type: 'expense', color: ColorsConstants[0], order: 1 },
  { id: '2', name: 'Salary', icon: '💼', type: 'income', color: ColorsConstants[1], order: 1 },
  { id: '3', name: 'Food', icon: '🍉', type: 'expense', color: ColorsConstants[2], order: 2 },
  { id: '4', name: 'Groceries', icon: '🥕', type: 'expense', color: ColorsConstants[3], order: 3 },
  { id: '5', name: 'Travelling', icon: '✈️', type: 'expense', color: ColorsConstants[4], order: 4 },
  { id: '6', name: 'Entertainment', icon: '🎬', type: 'expense', color: ColorsConstants[5], order: 5 },
  { id: '7', name: 'Medical', icon: '💊', type: 'expense', color: ColorsConstants[6], order: 6 },
  { id: '8', name: 'Education', icon: '🎓', type: 'expense', color: ColorsConstants[7], order: 7 },
  { id: '9', name: 'Gift', icon: '🎁', type: 'expense', color: ColorsConstants[8], order: 8 },
  { id: '10', name: 'Shopping', icon: '🛒', type: 'expense', color: ColorsConstants[8], order: 9 },
  { id: '101', name: 'Other', icon: '❗', type: 'expense', color: '#888888', order: 9 },
  { id: '102', name: 'Coupons', icon: '🏷️', type: 'income', color: ColorsConstants[9], order: 2 },
  { id: '103', name: 'Transfer', icon: '🔁', type: 'transfer', color: ColorsConstants[10], order: 1 },
  { id: '104', name: 'Investment', icon: '📈', type: 'investment', color: ColorsConstants[11], order: 1 },
  // User requested income categories
  { id: '105', name: 'Credit', icon: '💳', type: 'income', color: ColorsConstants[5], order: 3 },
  { id: '106', name: 'Refund', icon: '🔄', type: 'income', color: ColorsConstants[12], order: 4 },
  { id: '107', name: 'Rewards', icon: '🏆', type: 'income', color: ColorsConstants[1], order: 5 },
  { id: '108', name: 'Reimbursement', icon: '💼', type: 'income', color: ColorsConstants[7], order: 6 },
  { id: '109', name: 'Interest', icon: '📈', type: 'income', color: ColorsConstants[3], order: 7 },
  { id: '110', name: 'Bank Deposit', icon: '🏦', type: 'income', color: ColorsConstants[0], order: 8 },
  { id: '111', name: 'Business', icon: '🏢', type: 'income', color: ColorsConstants[6], order: 9 },
];
