/* A single Checkbox */
export const Checkbox = ({ label, value, checked, onChange }) => {
  return (
    <label style={{ display: 'block', margin: '5px 0' }}>
      <input type="checkbox" value={value} checked={checked} onChange={(e) => onChange(value, e.target.checked)} />
      {label}
    </label>
  );
};
