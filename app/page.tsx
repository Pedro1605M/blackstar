'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Scissors, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

// --- CONFIGURAÇÕES DO CALENDÁRIO ---
const DIAS_SEMANA_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ⚠️ NÚMERO DO WHATSAPP DO BARBEIRO (só números, com DDD)
const WHATSAPP_BARBEIRO = '5511999999999';

// --- SERVIÇOS DA BLACK STAR BARBER ---
const SERVICOS = [
  { 
    id: 'corte', 
    nome: 'Corte de Cabelo', 
    preco: 45, 
    duracao: 30, 
    desc: 'Corte tesoura ou máquina com acabamento de alta precisão.' 
  },
  { 
    id: 'barba', 
    nome: 'Barba Completa', 
    preco: 40, 
    duracao: 30, 
    desc: 'Modelagem completa da barba com toalha quente, hidratação e navalha.' 
  },
  { 
    id: 'corte-barba', 
    nome: 'Corte + Barba', 
    preco: 80, 
    duracao: 60, 
    desc: 'Combo completo de cabelo e barba com atendimento e finalização exclusiva.' 
  }
];

// Grade de funcionamento da barbearia
const HORARIOS_DIA: Record<number, { inicio: string; fim: string } | null> = {
  0: null, // Domingo: Fechado
  1: null, // Segunda: Fechada
  2: { inicio: '09:30', fim: '19:00' }, // Terça
  3: { inicio: '09:30', fim: '19:00' }, // Quarta
  4: { inicio: '09:30', fim: '19:30' }, // Quinta
  5: { inicio: '09:30', fim: '19:00' }, // Sexta
  6: { inicio: '08:00', fim: '17:00' }  // Sábado
};

export default function Home() {
  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  // Estado do calendário
  const [calYear, setCalYear] = useState(hoje.getFullYear());
  const [calMonth, setCalMonth] = useState(hoje.getMonth());

  // Estado do formulário
  const [servicoSelecionado, setServicoSelecionado] = useState(SERVICOS[0]);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  
  const [agendamentosExistentes, setAgendamentosExistentes] = useState<any[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [dadosComprovante, setDadosComprovante] = useState<any>(null);

  // Lista de anos para o dropdown (ano atual até +2 anos)
  const anosDisponiveis = [
    hoje.getFullYear(),
    hoje.getFullYear() + 1,
    hoje.getFullYear() + 2,
  ];

  // --- Lógica do Calendário ---
  const primeiroDiaMes = new Date(calYear, calMonth, 1).getDay();
  const diasNoMes = new Date(calYear, calMonth + 1, 0).getDate();
  const celulasVazias = Array.from({ length: primeiroDiaMes });
  const diasDoMes = Array.from({ length: diasNoMes }, (_, i) => i + 1);

  // Navegação de mês
  const irMesAnterior = () => {
    if (calMonth === 0) {
      if (calYear > hoje.getFullYear()) {
        setCalMonth(11);
        setCalYear((y) => y - 1);
      }
    } else {
      const mesAnterior = calMonth - 1;
      if (calYear > hoje.getFullYear() || mesAnterior >= hoje.getMonth()) {
        setCalMonth(mesAnterior);
      }
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
    const dataStr = `${calYear}-${mm}-${dd}`;

    // Não permitir data passada
    if (dataStr < hojeStr) return;

    // Verificar se domingo (0) ou segunda (1)
    const diaSemana = new Date(dataStr + 'T00:00:00').getDay();
    if (diaSemana === 0 || diaSemana === 1) return;

    setDataSelecionada(dataStr);
    setHorarioInicio('');
  };

  // Atalhos de data
  const irParaHoje = () => {
    setCalYear(hoje.getFullYear());
    setCalMonth(hoje.getMonth());
    const diaSemana = hoje.getDay();
    if (diaSemana !== 0 && diaSemana !== 1) {
      setDataSelecionada(hojeStr);
      setHorarioInicio('');
    }
  };

  const irParaAmanha = () => {
    const amanha = new Date();
    amanha.setDate(hoje.getDate() + 1);
    const mm = String(amanha.getMonth() + 1).padStart(2, '0');
    const dd = String(amanha.getDate()).padStart(2, '0');
    const amanhaStr = `${amanha.getFullYear()}-${mm}-${dd}`;
    setCalYear(amanha.getFullYear());
    setCalMonth(amanha.getMonth());

    const diaSemana = amanha.getDay();
    if (diaSemana !== 0 && diaSemana !== 1) {
      setDataSelecionada(amanhaStr);
      setHorarioInicio('');
    }
  };

  const isDiaSelecionado = (dia: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    return dataSelecionada === `${calYear}-${mm}-${dd}`;
  };

  const isDiaDesabilitado = (dia: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    const dataStr = `${calYear}-${mm}-${dd}`;
    if (dataStr < hojeStr) return true;
    const diaSemana = new Date(dataStr + 'T00:00:00').getDay();
    return diaSemana === 0 || diaSemana === 1;
  };

  const isHojeDia = (dia: number) => {
    return calYear === hoje.getFullYear() && calMonth === hoje.getMonth() && dia === hoje.getDate();
  };

  const podeMesAnterior = calYear > hoje.getFullYear() || calMonth > hoje.getMonth();

  // Buscar agendamentos existentes no Supabase quando selecionar a data
  useEffect(() => {
    if (!dataSelecionada) return;

    async function carregarAgendamentos() {
      setCarregandoHorarios(true);
      const { data, error } = await supabase
        .from('agendamentos')
        .select('horario_inicio, horario_fim, servico_duracao')
        .eq('data_agendamento', dataSelecionada);

      if (!error && data) {
        setAgendamentosExistentes(data);
      }
      setCarregandoHorarios(false);
    }

    carregarAgendamentos();
  }, [dataSelecionada]);

  // Converter horário "HH:MM" para minutos
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Converter minutos para "HH:MM"
  const minutesToTime = (minTotal: number) => {
    const h = Math.floor(minTotal / 60).toString().padStart(2, '0');
    const m = (minTotal % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // Gerar slots disponíveis no dia
  const gerarHorariosDisponiveis = () => {
    if (!dataSelecionada) return [];

    const dataObj = new Date(dataSelecionada + 'T00:00:00');
    const diaSemana = dataObj.getDay();
    const regraDia = HORARIOS_DIA[diaSemana];

    if (!regraDia) return [];

    const minInicioDia = timeToMinutes(regraDia.inicio);
    const minFimDia = timeToMinutes(regraDia.fim);
    const duracaoNecessaria = servicoSelecionado.duracao;

    const slots: { horario: string; disponivel: boolean }[] = [];

    const blocosOcupados = agendamentosExistentes.map(a => ({
      inicio: timeToMinutes(a.horario_inicio),
      fim: timeToMinutes(a.horario_fim)
    }));

    for (let current = minInicioDia; current + duracaoNecessaria <= minFimDia; current += 30) {
      const slotInicio = current;
      const slotFim = current + duracaoNecessaria;

      const conflito = blocosOcupados.some(ocupado => {
        return slotInicio < ocupado.fim && slotFim > ocupado.inicio;
      });

      slots.push({
        horario: minutesToTime(slotInicio),
        disponivel: !conflito
      });
    }

    return slots;
  };

  // Máscara de telefone (XX) XXXXX-XXXX
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setTelefone(value);
  };

  // Confirmar agendamento
  const handleConfirmarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!horarioInicio || !nome || !telefone || !dataSelecionada) return;

    setEnviando(true);

    const minInicio = timeToMinutes(horarioInicio);
    const minFim = minInicio + servicoSelecionado.duracao;
    const horarioFim = minutesToTime(minFim);

    const { error } = await supabase
      .from('agendamentos')
      .insert([
        {
          cliente_nome: nome,
          cliente_telefone: telefone,
          servico_id: servicoSelecionado.id,
          servico_nome: servicoSelecionado.nome,
          servico_preco: servicoSelecionado.preco,
          servico_duracao: servicoSelecionado.duracao,
          data_agendamento: dataSelecionada,
          horario_inicio: horarioInicio,
          horario_fim: horarioFim
        }
      ]);

    setEnviando(false);

    if (error) {
      alert('Erro ao confirmar agendamento: ' + error.message);
      return;
    }

    const [ano, mes, dia] = dataSelecionada.split('-');
    const dadosFinal = {
      nome,
      telefone,
      servico: servicoSelecionado.nome,
      preco: servicoSelecionado.preco,
      data: `${dia}/${mes}/${ano}`,
      horario: horarioInicio
    };

    setDadosComprovante(dadosFinal);
    setConcluido(true);
  };

  // Formatar data completa para o cabeçalho do horário
  const formatarDataCompleta = (dataIso: string) => {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const slotsDisponiveis = gerarHorariosDisponiveis();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-100">
      
      {/* HEADER EXECUTIVO */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-zinc-200">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100">Black Star Barber</h1>
              <p className="text-[11px] text-zinc-400">Atendimento Exclusivo com Barbeiro Marcelo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a 
              href="https://maps.google.com" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition text-xs font-medium"
              title="Ver endereço no mapa"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Localização</span>
            </a>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-8">

        {concluido ? (
          /* TELA DE CONFIRMAÇÃO / COMPROVANTE ELEGANTE */
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Agendamento Confirmado</h2>
              <p className="text-xs text-zinc-400">Seu horário está reservado com sucesso no sistema da barbearia.</p>
            </div>

            {/* Dados do Comprovante */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-3 text-xs">
              <div className="flex justify-between pb-2.5 border-b border-zinc-800/60">
                <span className="text-zinc-500">Cliente</span>
                <span className="font-medium text-zinc-200">{dadosComprovante?.nome}</span>
              </div>
              <div className="flex justify-between pb-2.5 border-b border-zinc-800/60">
                <span className="text-zinc-500">Telefone</span>
                <span className="font-mono text-zinc-300">{dadosComprovante?.telefone}</span>
              </div>
              <div className="flex justify-between pb-2.5 border-b border-zinc-800/60">
                <span className="text-zinc-500">Serviço</span>
                <span className="font-medium text-zinc-200">{dadosComprovante?.servico}</span>
              </div>
              <div className="flex justify-between pb-2.5 border-b border-zinc-800/60">
                <span className="text-zinc-500">Data</span>
                <span className="font-medium text-zinc-200">{dadosComprovante?.data}</span>
              </div>
              <div className="flex justify-between pb-2.5 border-b border-zinc-800/60">
                <span className="text-zinc-500">Horário</span>
                <span className="font-medium text-zinc-200">{dadosComprovante?.horario}h</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-zinc-400 font-medium">Valor Total</span>
                <span className="font-semibold text-sm text-amber-400">R$ {dadosComprovante?.preco},00</span>
              </div>
            </div>

            {/* Política de Cancelamento */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex gap-3 text-xs text-zinc-400">
              <ShieldAlert className="w-4 h-4 text-amber-500/90 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-zinc-300 font-medium mb-0.5">Política de Cancelamento:</strong>
                Cancelamentos devem ser solicitados pelo{' '}
                <a
                  href={`https://wa.me/${WHATSAPP_BARBEIRO}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-zinc-200 hover:text-white"
                >
                  WhatsApp do barbeiro
                </a>{' '}
                com no mínimo <strong>24h de antecedência</strong>. Em caso de não comparecimento ou cancelamento fora do prazo, é cobrado 50% do valor.
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setConcluido(false);
                  setHorarioInicio('');
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline transition cursor-pointer"
              >
                Fazer outro agendamento
              </button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO DE AGENDAMENTO PROFISSIONAL */
          <form onSubmit={handleConfirmarAgendamento} className="space-y-8">

            {/* ETAPA 1: SELEÇÃO DE SERVIÇO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-zinc-400" /> 1. Escolha o Serviço
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SERVICOS.map((s) => {
                  const selected = servicoSelecionado.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setServicoSelecionado(s);
                        setHorarioInicio('');
                      }}
                      className={`cursor-pointer p-4 rounded-xl border transition-all ${
                        selected
                          ? 'bg-zinc-900 border-zinc-500 ring-1 ring-zinc-500'
                          : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <h3 className="font-semibold text-zinc-100 text-sm">{s.nome}</h3>
                        <span className="text-amber-400 font-semibold text-sm">R$ {s.preco}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed min-h-[36px]">{s.desc}</p>
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                        <Clock className="w-3 h-3" /> {s.duracao} minutos
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ETAPA 2: CALENDÁRIO COM NAVEGAÇÃO FLUIDA DE MÊS E ANO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" /> 2. Escolha a Data
                </label>
                {dataSelecionada && (
                  <span className="text-xs font-medium text-zinc-300">
                    {dataSelecionada.split('-').reverse().join('/')}
                  </span>
                )}
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                
                {/* BARRA DE NAVEGAÇÃO FLUIDA DO MÊS */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Dropdowns Diretos de Mês e Ano */}
                  <div className="flex items-center gap-2">
                    <select
                      value={calMonth}
                      onChange={(e) => setCalMonth(Number(e.target.value))}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-medium py-1.5 px-2.5 rounded-lg outline-none focus:border-zinc-600 cursor-pointer"
                    >
                      {MESES_LABELS.map((mes, idx) => (
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

                    {/* Setas discretas para 1 clique */}
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={irMesAnterior}
                        disabled={!podeMesAnterior}
                        title="Mês anterior"
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={irProximoMes}
                        title="Próximo mês"
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Atalhos Rápidos */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={irParaHoje}
                      className="py-1 px-3 rounded-lg text-xs font-medium border bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={irParaAmanha}
                      className="py-1 px-3 rounded-lg text-xs font-medium border bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Amanhã
                    </button>
                  </div>
                </div>

                {/* Cabeçalho dos Dias da Semana */}
                <div className="grid grid-cols-7 text-center">
                  {DIAS_SEMANA_LABELS.map((d, i) => (
                    <span 
                      key={d} 
                      className={`text-[11px] font-medium py-1 ${
                        i === 0 || i === 1 ? 'text-zinc-600' : 'text-zinc-400'
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>

                {/* Grade de Dias */}
                <div className="grid grid-cols-7 gap-1">
                  {celulasVazias.map((_, i) => (
                    <div key={`vazio-${i}`} className="aspect-square" />
                  ))}
                  {diasDoMes.map((dia) => {
                    const desabilitado = isDiaDesabilitado(dia);
                    const selecionado = isDiaSelecionado(dia);
                    const hoje_ = isHojeDia(dia);

                    return (
                      <button
                        key={dia}
                        type="button"
                        disabled={desabilitado}
                        onClick={() => selecionarDia(dia)}
                        className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition ${
                          desabilitado
                            ? 'text-zinc-700 cursor-not-allowed'
                            : selecionado
                            ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm cursor-pointer'
                            : hoje_
                            ? 'border border-amber-500/50 text-amber-400 hover:bg-zinc-800 cursor-pointer'
                            : 'hover:bg-zinc-800 text-zinc-300 cursor-pointer'
                        }`}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>

                {/* Legenda Informativa */}
                <div className="pt-2.5 border-t border-zinc-800/60 flex flex-wrap items-center gap-4 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-zinc-100 inline-block" /> Selecionado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded border border-amber-500/50 inline-block" /> Hoje
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-zinc-700 font-bold text-xs">✕</span> Dom/Seg fechado
                  </span>
                </div>
              </div>
            </div>

            {/* ETAPA 3: HORÁRIOS DISPONÍVEIS */}
            {dataSelecionada && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" /> 3. Horários em {formatarDataCompleta(dataSelecionada)}
                  </label>
                  <span className="text-xs text-zinc-500 font-medium">
                    {servicoSelecionado.duracao === 60 ? 'Duração: 1h' : 'Duração: 30 min'}
                  </span>
                </div>

                {carregandoHorarios ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">Verificando horários livres...</div>
                ) : slotsDisponiveis.length === 0 ? (
                  <div className="p-6 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-center text-xs text-zinc-400">
                    A barbearia está fechada ou todos os horários já foram preenchidos para esta data.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {slotsDisponiveis.map((slot) => {
                      const selecionado = horarioInicio === slot.horario;
                      return (
                        <button
                          key={slot.horario}
                          type="button"
                          disabled={!slot.disponivel}
                          onClick={() => setHorarioInicio(slot.horario)}
                          className={`py-2.5 px-2 rounded-lg text-xs font-medium transition border cursor-pointer ${
                            !slot.disponivel
                              ? 'bg-zinc-950 border-zinc-900 text-zinc-700 line-through cursor-not-allowed'
                              : selecionado
                              ? 'bg-zinc-100 border-zinc-100 text-zinc-950 font-bold shadow-sm'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100'
                          }`}
                        >
                          {slot.horario}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 4: DADOS DO CLIENTE E CONFIRMAÇÃO */}
            {horarioInicio && (
              <div className="space-y-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  4. Informações para Confirmação
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1 font-medium">Nome Completo</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Seu nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-zinc-100 focus:outline-none focus:border-zinc-600 text-xs transition"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1 font-medium">WhatsApp</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={telefone}
                        onChange={handleTelefoneChange}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-zinc-100 focus:outline-none focus:border-zinc-600 text-xs font-mono transition"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Regra de Cancelamento */}
                <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl flex gap-3 text-xs text-zinc-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="text-zinc-300 font-medium">Aviso de Cancelamento:</strong> Cancelamentos devem ser solicitados pelo{' '}
                    <a
                      href={`https://wa.me/${WHATSAPP_BARBEIRO}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-zinc-300 hover:text-white"
                    >
                      WhatsApp do barbeiro
                    </a>{' '}
                    com no mínimo <strong>24h de antecedência</strong>. Em caso de não comparecimento sem aviso, será cobrado 50% do valor do corte.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-3 rounded-xl transition active:scale-[0.99] disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
                >
                  {enviando ? 'Confirmando no sistema...' : 'Confirmar Agendamento'}
                </button>
              </div>
            )}

          </form>
        )}

      </main>

      {/* RODAPÉ ELEGANTE */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <p>Black Star Barber © {new Date().getFullYear()} — Atendimento Profissional com Barbeiro Marcelo</p>
      </footer>

    </div>
  );
}