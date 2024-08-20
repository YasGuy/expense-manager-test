import React, { useState, useEffect } from 'react';

function SalaryInput({ onSalaryChange }) {
  const [salary, setSalary] = useState(0);

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        const response = await fetch(`http://localhost:5000/salary`);
        const amount = await response.json();
        setSalary(amount);
        onSalaryChange(amount);
      } catch (error) {
        console.error('Error fetching salary:', error);
      }
    };

    fetchSalary();
  }, [onSalaryChange]);

  const handleSalaryChange = async (e) => {
    const newSalary = parseFloat(e.target.value);
    setSalary(newSalary);
    onSalaryChange(newSalary);

    try {
      await fetch(`http://localhost:5000/salary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: newSalary })
      });
    } catch (error) {
      console.error('Error updating salary:', error);
    }
  };

  return (
    <div className="salary-input">
      <label htmlFor="salary">Enter Salary: </label>
      <input
        type="number"
        id="salary"
        value={salary}
        onChange={handleSalaryChange}
      />
    </div>
  );
}

export default SalaryInput;
