import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AddExpenseForm from './components/AddExpenseForm';
import ExpenseTable from './components/ExpenseTable';
import SalaryInput from './components/SalaryInput';
import './App.css';

function App() {
  const [expenses, setExpenses] = useState([]);
  const [salary, setSalary] = useState(0);

  useEffect(() => {
    const fetchExpenses = async () => {
      const response = await fetch(`http://localhost:5000/expenses`);
      const data = await response.json();
      setExpenses(data);
    };

    fetchExpenses();
  }, []);

  const handleAddExpense = async (expense) => {
    const response = await fetch(`http://localhost:5000/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(expense)
    });

    const result = await response.json();
    setExpenses([...expenses, result]);
  };

  const totalExpenses = expenses.reduce((total, expense) => total + parseFloat(expense.amount), 0);
  const remainingBalance = salary - totalExpenses;

  return (
    <div className="App">
      <Header />
      <SalaryInput onSalaryChange={(value) => setSalary(value)} />
      <AddExpenseForm onAddExpense={handleAddExpense} />
      <ExpenseTable expenses={expenses} />
      <div className="remaining-balance">
        Remaining Balance: {remainingBalance.toFixed(2)} €
      </div>
    </div>
  );
}

export default App;
