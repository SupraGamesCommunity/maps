/* A single Checkbox */
export const Checkbox = ({ label, value, checked, onChange }) => {
  return (
    <label>
      <input type="checkbox" value={value} checked={checked} onChange={(e) => onChange(value, e.target.checked)} />
      {label}
    </label>
  );
};
