import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import { todayGregorian } from '../../../shared/jalali';

function toGregorianYMD(pickerValue) {
  if (!pickerValue) return '';
  try {
    // pickerValue معمولاً DateObject است (react-date-object)
    const g = pickerValue.convert(gregorian, gregorian_en);
    return g.format('YYYY-MM-DD');
  } catch {
    return '';
  }
}

function toPersianDateObject(gregorianYmd) {
  const v = gregorianYmd || todayGregorian();
  // v: YYYY-MM-DD
  const [gy, gm, gd] = v.split('-').map((x) => Number(x));
  const g = new DateObject({ calendar: gregorian, locale: gregorian_en, year: gy, month: gm, day: gd });
  return g.convert(persian, persian_fa);
}

export default function PersianDatePicker({ value, onChange, min = todayGregorian(), className = '' }) {
  const pickerValue = value ? toPersianDateObject(value) : null;
  const minValue = min ? toPersianDateObject(min) : null;

  return (
    <div className={className}>
      <DatePicker
        value={pickerValue}
        onChange={(v) => onChange(toGregorianYMD(v))}
        calendar={persian}
        locale={persian_fa}
        calendarPosition="bottom-right"
        minDate={minValue}
        format="YYYY/MM/DD"
        inputClass="w-full border-2 border-stone-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white"
        containerClassName="w-full"
        placeholder="تاریخ را انتخاب کنید"
      />
    </div>
  );
}

