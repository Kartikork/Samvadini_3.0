import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface MessageStatusIconProps {
  status: 'sent' | 'delivered' | 'read' | string;
}

const MessageStatusIcon: React.FC<MessageStatusIconProps> = ({ status }) => {
  const normalizedStatus = status?.toLowerCase() || 'sent';

  switch (normalizedStatus) {
    case 'sent':
      return <Icon name="check" size={16} color="#999"  style={{ marginLeft: 5 }}/>;

    case 'delivered':
      return <Icon name="check-all" size={16} color="#999"  style={{ marginLeft: 5 }}/>;

    case 'read':
      return <Icon name="check-all" size={16} color="#028BD3"  style={{ marginLeft: 5 }} />;

    default:
      return <Icon name="check" size={16} color="#999"  style={{ marginLeft: 5}}/>;
  }
};

export default React.memo(MessageStatusIcon);
