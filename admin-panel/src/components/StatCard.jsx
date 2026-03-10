const StatCard = ({
  icon: Icon,
  title,
  value,
  change,
  changeType,
  iconColor,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* Title */}
          <p className="text-gray-500 text-sm font-medium mb-1">
            {title}
          </p>

          {/* Value */}
          <p className="text-3xl font-bold text-dark-800 mb-2">
            {value}
          </p>

          {/* Change */}
          {change !== undefined && (
            <div className="flex items-center gap-1">
              <span
                className={`text-sm font-medium ${
                  changeType === 'increase'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {changeType === 'increase' ? '↑' : '↓'} {change}%
              </span>
              <span className="text-xs text-gray-400">
                vs last month
              </span>
            </div>
          )}
        </div>

        {/* Icon */}
        <div
          className={`p-4 rounded-full ${
            iconColor || 'bg-blue-500/10'
          }`}
        >
          <Icon className="text-3xl" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
