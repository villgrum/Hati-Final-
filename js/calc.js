function sharesOfBill(bill) {
  const count = bill.sharers.length;
  const base = Math.floor(bill.amount / count);
  const leftover = bill.amount - base * count;
  const leftoverTo = bill.sharers.includes(bill.payer)
    ? bill.payer
    : bill.sharers[0];
  const shares = {};
  bill.sharers.forEach(function (name) {
    shares[name] = base + (name === leftoverTo ? leftover : 0);
  });
  return shares;
}

function standingsOf(group) {
  const rows = {};
  group.members.forEach(function (name) {
    rows[name] = { name: name, paid: 0, share: 0, balance: 0 };
  });
  group.bills.forEach(function (bill) {
    rows[bill.payer].paid += bill.amount;
    const shares = sharesOfBill(bill);
    Object.keys(shares).forEach(function (name) {
      rows[name].share += shares[name];
    });
  });
  const list = Object.values(rows);
  list.forEach(function (row) {
    row.balance = row.paid - row.share;
  });
  (group.bills.length ? group.payments : []).forEach(function (payment) {
    rows[payment.from].balance += payment.amount;
    rows[payment.to].balance -= payment.amount;
  });
  return list;
}

function planOf(rows) {
  const givers = rows
    .filter(function (row) {
      return row.balance < 0;
    })
    .map(function (row) {
      return { name: row.name, left: -row.balance };
    })
    .sort(function (a, b) {
      return b.left - a.left;
    });
  const takers = rows
    .filter(function (row) {
      return row.balance > 0;
    })
    .map(function (row) {
      return { name: row.name, left: row.balance };
    })
    .sort(function (a, b) {
      return b.left - a.left;
    });
  const plan = [];
  let giver = 0;
  let taker = 0;
  while (giver < givers.length && taker < takers.length) {
    const amount = Math.min(givers[giver].left, takers[taker].left);
    plan.push({
      from: givers[giver].name,
      to: takers[taker].name,
      amount: amount,
    });
    givers[giver].left -= amount;
    takers[taker].left -= amount;
    if (givers[giver].left === 0) {
      giver += 1;
    }
    if (takers[taker].left === 0) {
      taker += 1;
    }
  }
  return plan;
}

function totalsOf(group, rows) {
  const spent = group.bills.reduce(function (sum, bill) {
    return sum + bill.amount;
  }, 0);
  const settled = group.bills.length
    ? group.payments.reduce(function (sum, payment) {
        return sum + payment.amount;
      }, 0)
    : 0;
  const remaining = rows.reduce(function (sum, row) {
    return row.balance > 0 ? sum + row.balance : sum;
  }, 0);
  return {
    spent: spent,
    settled: settled,
    remaining: remaining,
    total: settled + remaining,
  };
}

function nextPayerOf(rows) {
  return rows.slice().sort(function (a, b) {
    return (
      a.paid - a.share - (b.paid - b.share) ||
      a.paid - b.paid ||
      a.name.localeCompare(b.name)
    );
  })[0];
}
