"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EmiCalculatorPage() {
  const [amount, setAmount] = useState(500000);
  const [interest, setInterest] = useState(10.5);
  const [tenure, setTenure] = useState(60);
  const [emi, setEmi] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);

  useEffect(() => {
    const calculateEmi = () => {
      if (amount > 0 && interest > 0 && tenure > 0) {
        const principal = amount;
        const rateOfInterest = interest / 12 / 100;
        const numberOfPayments = tenure;

        const calculatedEmi =
          (principal * rateOfInterest * Math.pow(1 + rateOfInterest, numberOfPayments)) /
          (Math.pow(1 + rateOfInterest, numberOfPayments) - 1);

        if (isFinite(calculatedEmi)) {
          const totalAmount = calculatedEmi * numberOfPayments;
          const interestPayable = totalAmount - principal;
          setEmi(Math.round(calculatedEmi));
          setTotalInterest(Math.round(interestPayable));
          setTotalPayable(Math.round(totalAmount));
        }
      } else {
        setEmi(0);
        setTotalInterest(0);
        setTotalPayable(0);
      }
    };
    calculateEmi();
  }, [amount, interest, tenure]);

  const repaymentSchedule = useMemo(() => {
    if (!emi || !amount || !interest || !tenure) return [];
    
    let balance = amount;
    const schedule = [];
    const monthlyInterestRate = interest / 12 / 100;

    for (let i = 1; i <= tenure; i++) {
      const interestPayment = balance * monthlyInterestRate;
      const principalPayment = emi - interestPayment;
      balance -= principalPayment;
      
      schedule.push({
        month: i,
        principal: Math.round(principalPayment),
        interest: Math.round(interestPayment),
        totalPayment: Math.round(emi),
        balance: Math.round(balance > 0 ? balance : 0),
      });
    }
    return schedule;
  }, [emi, amount, interest, tenure]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <div className="space-y-8">
        <h1 className="text-2xl font-headline font-semibold">EMI Calculator</h1>
        <Card className="shadow-lg">
            <CardContent className="grid md:grid-cols-2 gap-8 p-6">
                <div className="space-y-6">
                    <div>
                        <Label htmlFor="amount">Loan Amount (₹)</Label>
                        <Input id="amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="text-lg font-semibold mt-2" />
                        <Slider value={[amount]} onValueChange={(value) => setAmount(value[0])} max={5000000} step={10000} className="mt-2" />
                    </div>
                    <div>
                        <Label htmlFor="interest">Interest Rate (%)</Label>
                        <Input id="interest" value={interest} onChange={(e) => setInterest(Number(e.target.value))} className="text-lg font-semibold mt-2" />
                        <Slider value={[interest]} onValueChange={(value) => setInterest(value[0])} max={25} step={0.1} className="mt-2" />
                    </div>
                    <div>
                        <Label htmlFor="tenure">Tenure (Months)</Label>
                        <Input id="tenure" value={tenure} onChange={(e) => setTenure(Number(e.target.value))} className="text-lg font-semibold mt-2" />
                        <Slider value={[tenure]} onValueChange={(value) => setTenure(value[0])} max={360} step={1} className="mt-2" />
                    </div>
                </div>
                <div className="bg-primary/5 rounded-lg p-6 flex flex-col justify-center items-center text-center space-y-4">
                    <div>
                        <p className="text-muted-foreground">Monthly EMI</p>
                        <p className="text-4xl font-bold text-primary">{formatCurrency(emi)}</p>
                    </div>
                     <div>
                        <p className="text-muted-foreground">Total Interest Payable</p>
                        <p className="text-2xl font-semibold">{formatCurrency(totalInterest)}</p>
                    </div>
                     <div>
                        <p className="text-muted-foreground">Total Repayable Amount</p>
                        <p className="text-2xl font-semibold">{formatCurrency(totalPayable)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Payment Schedule Preview</CardTitle>
                <CardDescription>A detailed breakdown of your expected monthly payments.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96 w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Month</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead>Principal</TableHead>
                                <TableHead>Interest</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead>Date Received</TableHead>
                                <TableHead>Remark</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {repaymentSchedule.length > 0 ? repaymentSchedule.map((row) => (
                                <TableRow key={row.month}>
                                    <TableCell className="font-medium">{row.month}</TableCell>
                                    <TableCell>{formatCurrency(row.totalPayment)}</TableCell>
                                    <TableCell>{formatCurrency(row.principal)}</TableCell>
                                    <TableCell>{formatCurrency(row.interest)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(row.balance)}</TableCell>
                                    <TableCell>---</TableCell>
                                    <TableCell>---</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No schedule to display. Adjust the loan terms above.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    </div>
  )
}
