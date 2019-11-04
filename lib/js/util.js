function padLeftZero(str) {
  return ('00' + str).substr(str.length)
}

function getWeek(day) {
  day *= 1;
  var week = '';
  switch (day) {
    case 0:
      week = "日";
      break;
    case 1:
      week = "一";
      break;
    case 2:
      week = "二";
      break;
    case 3:
      week = "三";
      break;
    case 4:
      week = "四";
      break;
    case 5:
      week = "五";
      break;
    case 6:
      week = "六";
      break;
  }
  return week;
}

function formatDate(date, fmt) {
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length))
  }
    var o = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    'w+': date.getDay(),
  }
  for (var k in o) {
    if (new RegExp('(${k})').test(fmt)) {
        var str = o[k] + ''
      if (k === 'w+') {
        fmt = fmt.replace(RegExp.$1, getWeek(str))
      } else {
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? str : padLeftZero(str))
      }
    }
  }
  return fmt
}
