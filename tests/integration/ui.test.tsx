import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, Modal, QueryError, Tabs } from '@/shared/ui';

function Confirmation() {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Проверить</Button>
      <output>{confirmed ? 'Исполнено' : 'Не исполнено'}</output>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Подтвердить покупку"
        description="Виртуальная заявка"
      >
        <Button
          onClick={() => {
            setConfirmed(true);
            setOpen(false);
          }}
        >
          Подтвердить
        </Button>
      </Modal>
    </>
  );
}

describe('общие интерактивные элементы', () => {
  it('отмена диалога через Escape возвращает фокус и не подтверждает действие', async () => {
    const user = userEvent.setup();
    render(<Confirmation />);
    const trigger = screen.getByRole('button', { name: 'Проверить' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Подтвердить покупку' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(screen.getByText('Не исполнено')).toBeInTheDocument();
  });

  it('только явное подтверждение завершает действие', async () => {
    const user = userEvent.setup();
    render(<Confirmation />);
    await user.click(screen.getByRole('button', { name: 'Проверить' }));
    await user.click(screen.getByRole('button', { name: 'Подтвердить' }));
    expect(screen.getByText('Исполнено')).toBeInTheDocument();
  });

  it('показывает ошибку и дает повторить запрос', async () => {
    const retry = vi.fn();
    render(<QueryError error={new Error('Портфель недоступен')} retry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Портфель недоступен');
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('вкладки сообщают выбранное состояние и вызывают переход', async () => {
    const changed = vi.fn();
    render(
      <Tabs
        items={[
          { value: 'all', label: 'Все' },
          { value: 'friends', label: 'Друзья' },
        ]}
        value="all"
        onChange={changed}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Все' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Друзья' }));
    expect(changed).toHaveBeenCalledWith('friends');
  });
});
