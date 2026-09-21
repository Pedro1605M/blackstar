'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Scissors,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  CalendarDays,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react';

// --- CONFIGURAÇÕES ---
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Serviços cadastrados na barbearia
const SERVICOS = [
  { id: 'corte', nome: 'Corte de Cabelo', preco: 45, duracao: 30 },
  { id: 'barba', nome: 'Barba Completa', preco: 40, duracao: 30 },
  { id: 'corte-barba', nome: 'Corte + Barba', preco: 80, duracao: 60 },
];

// Grade horária para agendamento manual
const HORARIOS_DISPONIVEIS_PADRAO = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
];

// PIN de acesso do barbeiro (configurável no .env.local via NEXT_PUBLIC_ADMIN_PIN)
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '1234';

type Agendamento = {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  servico_nome: string;
  servico_preco: number;
  horario_inicio: string;
  horario_fim: string;
  data_agendamento: string;
};

export default function AgendaAdmin() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Navegação de Data
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [dataSelecionada, setDataSelecionada] = useState(todayStr);

  // Dados
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [diasComAgendamento, setDiasComAgendamento] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Modal de Agendamento Manual
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoServico, setNovoServico] = useState(SERVICOS[0]);
  const [novaData, setNovaData] = useState(todayStr);
  const [novoHorario, setNovoHorario] = useState('09:30');
  const [salvandoManual, setSalvandoManual] = useState(false);
  const [erroModal, setErroModal] = useState('');

  // Anos disponíveis para seleção rápida no dropdown
  const anosDisponiveis = [
    today.getFullYear() - 1,
    today.getFullYear(),
    today.getFullYear() + 1,
    today.getFullYear() + 2,
  ];

  // Buscar agendamentos do dia selecionado
  const carregarAgendamentosDoDia = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('data_agendamento', dataSelecionada)
      .order('horario_inicio', { ascending: true });

    if (!error && data) {
      setAgendamentos(data);
    }
    setCarregando(false);
  }, [dataSelecionada]);

  // Buscar dias com agendamento no mês corrente para marcar com ponto no calendário
  const carregarDiasOcupadosNoMes = useCallback(async () => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const inicioMes = `${calYear}-${mm}-01`;
    const diasNoMesAtual = new Date(calYear, calMonth + 1, 0).getDate();
    const fimMes = `${calYear}-${mm}-${String(diasNoMesAtual).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('agendamentos')
      .select('data_agendamento')
      .gte('data_agendamento', inicioMes)
      .lte('data_agendamento', fimMes);

    if (!error && data) {
      const setDias = new Set<string>();
      data.forEach((item: { data_agendamento: string }) => {
        setDias.add(item.data_agendamento);
      });
      setDiasComAgendamento(setDias);
    }
  }, [calYear, calMonth]);

  useEffect(() => {
    carregarAgendamentosDoDia();
  }, [carregarAgendamentosDoDia]);

  useEffect(() => {
    carregarDiasOcupadosNoMes();
  }, [carregarDiasOcupadosNoMes]);

  // Escutar agendamentos em TEMPO REAL (atualiza sozinho quando um cliente agenda ou cancela)
  useEffect(() => {
    const canal = supabase
      .channel('realtime-agenda-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos' },
        () => {
          carregarAgendamentosDoDia();
          carregarDiasOcupadosNoMes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregarAgendamentosDoDia, carregarDiasOcupadosNoMes]);

  // Excluir agendamento
  const cancelarAgendamento = async (id: string) => {
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id);

    if (!error) {
      setAgendamentos((prev) => prev.filter((a) => a.id !== id));
      carregarDiasOcupadosNoMes();
    }
    setConfirmDelete(null);
  };

  // Abrir modal de novo agendamento manual
  const abrirModalNovo = () => {
    setNovaData(dataSelecionada);
    setNovoNome('');
    setNovoTelefone('');
    setNovoServico(SERVICOS[0]);
    setNovoHorario('09:30');
    setErroModal('');
    setModalNovoAberto(true);
  };

  // Salvar novo agendamento manual
  const salvarNovoAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      setErroModal('Por favor, informe o nome do cliente.');
      return;
    }

    setSalvandoManual(true);
    setErroModal('');

    const [h, m] = novoHorario.split(':').map(Number);
    const minNovoInicio = h * 60 + m;
    const minFim = minNovoInicio + novoServico.duracao;
    const horaFim = Math.floor(minFim / 60).toString().padStart(2, '0');
    const minFimStr = (minFim % 60).toString().padStart(2, '0');
    const horarioFim = `${horaFim}:${minFimStr}`;

    // Checagem anti-conflito de horários
    const { data: existentes } = await supabase
      .from('agendamentos')
      .select('horario_inicio, horario_fim')
      .eq('data_agendamento', novaData);

    if (existentes) {
      const conflito = existentes.some((a) => {
        const [aH, aM] = a.horario_inicio.split(':').map(Number);
        const [fH, fM] = a.horario_fim.split(':').map(Number);
        const aIni = aH * 60 + aM;
        const aFim = fH * 60 + fM;
        return minNovoInicio < aFim && minFim > aIni;
      });

      if (conflito) {
        setSalvandoManual(false);
        setErroModal('Atenção: Já existe outro agendamento ocupando esse mesmo horário nesta data.');
        return;
      }
    }

    const { error } = await supabase
      .from('agendamentos')
      .insert([
        {
          cliente_nome: novoNome.trim(),
          cliente_telefone: novoTelefone.trim() || '(Não informado)',
          servico_id: novoServico.id,
          servico_nome: novoServico.nome,
          servico_preco: novoServico.preco,
          servico_duracao: novoServico.duracao,
          data_agendamento: novaData,
          horario_inicio: novoHorario,
          horario_fim: horarioFim,
        },
      ]);

    setSalvandoManual(false);

    if (error) {
      setErroModal('Erro ao salvar agendamento: ' + error.message);
      return;
    }

    // Se salvou na data que já está selecionada, recarrega o dia
    if (novaData === dataSelecionada) {
      carregarAgendamentosDoDia();
    } else {
      // Muda para a data do agendamento para o barbeiro ver imediatamente
      setDataSelecionada(novaData);
      const [aAno, aMes] = novaData.split('-').map(Number);
      setCalYear(aAno);
      setCalMonth(aMes - 1);
    }

    carregarDiasOcupadosNoMes();
    setModalNovoAberto(false);
  };

  // Enviar lembrete via WhatsApp
  const abrirWhatsApp = (a: Agendamento) => {
    const numLimpo = a.cliente_telefone.replace(/\D/g, '');
    const [ano, mes, dia] = a.data_agendamento.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;
    const hora = a.horario_inicio.slice(0, 5);

    const texto = `Olá *${a.cliente_nome}*! Tudo bem? Aqui é o barbeiro Marcelo da *Black Star Barber* 💈\n\nPassando para confirmar seu horário:\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${hora}\n✂️ *Serviço:* ${a.servico_nome} (R$ ${a.servico_preco},00)\n📍 *Local:* Rua Herminia Maria Vincentini, 58 - Jardim Marajó, Campinas - SP\nhttps://maps.google.com/?q=Rua+Herminia+Maria+Vincentini+58+Campinas\n\nPodemos confirmar sua presença?`;

    const mensagem = encodeURIComponent(texto);
    window.open(`https://wa.me/55${numLimpo}?text=${mensagem}`, '_blank');
  };

  // Formatar data por extenso
  const formatarDataExtenso = (dataIso: string) => {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-').map(Number);
    const dateObj = new Date(ano, mes - 1, dia);
    return dateObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Funções de navegação de data
  const irMesAnterior = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const irProximoMes = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const selecionarDia = (dia: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    setDataSelecionada(`${calYear}-${mm}-${dd}`);
  };

  const irParaHoje = () => {
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
    setDataSelecionada(todayStr);
  };

  const irParaAmanha = () => {
    const amanha = new Date();
    amanha.setDate(today.getDate() + 1);
    const amanhaStr = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`;
    setCalYear(amanha.getFullYear());
    setCalMonth(amanha.getMonth());
    setDataSelecionada(amanhaStr);
  };

  // Lógica do grid do calendário
  const primeiroDiaSemana = new Date(calYear, calMonth, 1).getDay();
  const totalDiasNoMes = new Date(calYear, calMonth + 1, 0).getDate();
  const celulasVazias = Array.from({ length: primeiroDiaSemana });
  const diasDoMes = Array.from({ length: totalDiasNoMes }, (_, i) => i + 1);

  // Cálculos de métricas do dia
  const faturamentoTotalDia = agendamentos.reduce((acc, a) => acc + Number(a.servico_preco || 0), 0);
  const primeiroHorario = agendamentos.length > 0 ? agendamentos[0].horario_inicio.slice(0, 5) : null;

  // PAINEL ADMINISTRATIVO PROFISSIONAL
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-100">

      {/* HEADER EXECUTIVO */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-zinc-200">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100">Black Star Barber</h1>
              <p className="text-[11px] text-zinc-400">Gestão de Agenda e Clientes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicador de Tempo Real */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Tempo Real</span>
            </div>

            {/* BOTÃO NOVO AGENDAMENTO */}
            <button
              onClick={abrirModalNovo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Agendamento</span>
            </button>

            <button
              onClick={() => {
                carregarAgendamentosDoDia();
                carregarDiasOcupadosNoMes();
              }}
              title="Recarregar dados"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition text-xs font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin text-zinc-400' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <Link
              href="/"
              title="Voltar ao site principal"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voltar ao site</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* MÉTRICAS / RESUMO DO DIA SELECIONADO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400">Agendamentos no Dia</p>
              <p className="text-2xl font-semibold text-zinc-100">
                {agendamentos.length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-800/60 border border-zinc-750 flex items-center justify-center text-zinc-300">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400">Faturamento Previsto</p>
              <p className="text-2xl font-semibold text-zinc-100">
                R$ {faturamentoTotalDia},00
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-800/60 border border-zinc-750 flex items-center justify-center text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400">Primeiro Horário</p>
              <p className="text-2xl font-semibold text-zinc-100">
                {primeiroHorario ? `${primeiroHorario}h` : '—'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-800/60 border border-zinc-750 flex items-center justify-center text-zinc-300">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ÁREA PRINCIPAL: CALENDÁRIO + HORÁRIOS */}
        <div className="grid grid-cols-1 md:grid-cols-[330px_1fr] gap-6 items-start">

          {/* CALENDÁRIO COM SELETOR FLUIDO DE MÊS E ANO */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 space-y-4">

            {/* SELETOR FLUIDO: DROPDOWNS DIRETOS + ATALHOS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-1">
                {/* Seletores Diretos de Mês e Ano */}
                <div className="flex items-center gap-1.5 flex-1">
                  <select
                    value={calMonth}
                    onChange={(e) => setCalMonth(Number(e.target.value))}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-medium py-1.5 px-2.5 rounded-lg outline-none focus:border-zinc-600 cursor-pointer"
                  >
                    {MESES.map((mes, idx) => (
                      <option key={mes} value={idx}>
                        {mes}
                      </option>
                    ))}
                  </select>

                  <select
                    value={calYear}
                    onChange={(e) => setCalYear(Number(e.target.value))}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-medium py-1.5 px-2.5 rounded-lg outline-none focus:border-zinc-600 cursor-pointer"
                  >
                    {anosDisponiveis.map((ano) => (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Setas de avançar/voltar um mês */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={irMesAnterior}
                    title="Mês anterior"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={irProximoMes}
                    title="Próximo mês"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Botões de Atalho Rápido */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={irParaHoje}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    dataSelecionada === todayStr
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={irParaAmanha}
                  className="flex-1 py-1 px-2.5 rounded-lg text-xs font-medium border bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition cursor-pointer"
                >
                  Amanhã
                </button>
              </div>
            </div>

            {/* CABEÇALHO DIAS DA SEMANA */}
            <div className="grid grid-cols-7 text-center">
              {DIAS_SEMANA.map((d) => (
                <span key={d} className="text-[11px] font-medium text-zinc-500 py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* GRID DO MÊS */}
            <div className="grid grid-cols-7 gap-1">
              {celulasVazias.map((_, i) => (
                <div key={`v-${i}`} className="aspect-square" />
              ))}
              {diasDoMes.map((dia) => {
                const mm = String(calMonth + 1).padStart(2, '0');
                const dd = String(dia).padStart(2, '0');
                const isoDate = `${calYear}-${mm}-${dd}`;
                const selecionado = dataSelecionada === isoDate;
                const isHoje = todayStr === isoDate;
                const temAgendamento = diasComAgendamento.has(isoDate);

                return (
                  <button
                    key={dia}
                    onClick={() => selecionarDia(dia)}
                    className={`aspect-square relative flex flex-col items-center justify-center rounded-lg text-xs font-medium transition cursor-pointer ${
                      selecionado
                        ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                        : isHoje
                        ? 'border border-amber-500/50 text-amber-400 hover:bg-zinc-800'
                        : 'hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span>{dia}</span>
                    {temAgendamento && (
                      <span
                        className={`w-1 h-1 rounded-full absolute bottom-1.5 ${
                          selecionado ? 'bg-zinc-950' : 'bg-amber-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Com clientes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-amber-500/60 rounded inline-block" /> Hoje
              </span>
            </div>
          </div>

          {/* LISTA DE AGENDAMENTOS DO DIA */}
          <div className="space-y-4">
            {/* TÍTULO DA DATA SELECIONADA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800/80 gap-2">
              <div>
                <h2 className="text-base font-semibold text-zinc-100 capitalize">
                  {formatarDataExtenso(dataSelecionada)}
                </h2>
                <p className="text-xs text-zinc-400">
                  {agendamentos.length === 0
                    ? 'Nenhum horário marcado'
                    : `${agendamentos.length} cliente${agendamentos.length > 1 ? 's' : ''} agendado${agendamentos.length > 1 ? 's' : ''}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={abrirModalNovo}
                  className="sm:hidden flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
                {agendamentos.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{agendamentos.length} horários</span>
                  </div>
                )}
              </div>
            </div>

            {/* CONTEÚDO DOS AGENDAMENTOS */}
            {carregando ? (
              <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
                Carregando horários...
              </div>
            ) : agendamentos.length === 0 ? (
              <div className="py-16 text-center bg-zinc-900/40 border border-zinc-800/60 rounded-2xl space-y-3">
                <CalendarIcon className="w-8 h-8 text-zinc-700 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-400">Sem agendamentos nesta data</p>
                  <p className="text-xs text-zinc-600 max-w-xs mx-auto">
                    Nenhum cliente marcado para este dia.
                  </p>
                </div>
                <button
                  onClick={abrirModalNovo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar horário manualmente
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {agendamentos.map((a) => (
                  <div
                    key={a.id}
                    className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-zinc-700 transition"
                  >
                    {/* Bloco de Horário */}
                    <div className="flex items-center gap-3 sm:w-28 shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-100 text-sm">{a.horario_inicio.slice(0, 5)}</p>
                        <p className="text-[11px] text-zinc-500">até {a.horario_fim.slice(0, 5)}</p>
                      </div>
                    </div>

                    <div className="hidden sm:block w-px h-10 bg-zinc-800" />

                    {/* Informações do Cliente & Serviço */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="font-medium text-zinc-100 text-sm truncate">{a.cliente_nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-zinc-400 text-xs font-mono">{a.cliente_telefone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-zinc-400 text-xs truncate">{a.servico_nome}</span>
                        <span className="ml-auto font-medium text-amber-400 text-xs">
                          R$ {a.servico_preco},00
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                      <button
                        onClick={() => abrirWhatsApp(a)}
                        title="Enviar lembrete pelo WhatsApp"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/60 transition text-xs font-medium cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Lembrar cliente
                      </button>
                      <button
                        onClick={() => setConfirmDelete(a.id)}
                        title="Cancelar agendamento"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 hover:border-red-700 text-red-300 hover:text-white transition text-xs font-medium cursor-pointer"
                      >
                        Cancelar agendamento
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL DE NOVO AGENDAMENTO MANUAL */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100 text-base">Novo Agendamento</h3>
                  <p className="text-xs text-zinc-400">Cadastre diretamente na agenda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                className="text-zinc-500 hover:text-zinc-300 transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarNovoAgendamento} className="space-y-4 text-xs">
              {/* Nome do Cliente */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Nome do Cliente *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Ex: Carlos Ferreira"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    required
                    autoFocus
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-xs transition"
                  />
                </div>
              </div>

              {/* Telefone / WhatsApp */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1">WhatsApp / Telefone (opcional)</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={novoTelefone}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '');
                      if (v.length > 11) v = v.slice(0, 11);
                      if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
                      else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                      else if (v.length > 0) v = `(${v}`;
                      setNovoTelefone(v);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-xs font-mono transition"
                  />
                </div>
              </div>

              {/* Serviço */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Serviço</label>
                <select
                  value={novoServico.id}
                  onChange={(e) => {
                    const serv = SERVICOS.find((s) => s.id === e.target.value) || SERVICOS[0];
                    setNovoServico(serv);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-zinc-600 text-xs cursor-pointer transition"
                >
                  {SERVICOS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — R$ {s.preco},00 ({s.duracao} min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Data e Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Data</label>
                  <input
                    type="date"
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-zinc-600 text-xs cursor-pointer transition"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Horário</label>
                  <select
                    value={novoHorario}
                    onChange={(e) => setNovoHorario(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-zinc-600 text-xs cursor-pointer transition"
                  >
                    {HORARIOS_DISPONIVEIS_PADRAO.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {erroModal && (
                <p className="text-red-400 text-xs flex items-center gap-1.5 pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {erroModal}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoManual}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {salvandoManual ? 'Salvando...' : 'Salvar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-semibold text-zinc-100 text-base">Cancelar agendamento?</h3>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Essa ação removerá o agendamento do banco de dados e liberará o horário para outros clientes.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition text-xs font-medium cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => cancelarAgendamento(confirmDelete)}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition text-xs cursor-pointer"
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
